import { randomUUID } from "node:crypto";
import { test, expect, type Page } from "@playwright/test";
import { encode } from "@auth/core/jwt";
import { createClient } from "@supabase/supabase-js";
import { WEB_SERVER_ENV } from "../../playwright.config";

/**
 * ログイン済みのビュー切り替えとタグ絞り込みが「サーバーに戻らない」ことを固定する。
 *
 * - セッション Cookie は @auth/core/jwt の encode で偽造する（uid が要る。
 *   docs/implementation-status.md「認証が要る画面を Playwright で確かめるとき」参照）
 * - prompts.owner_id は next_auth.users を参照するため、service role で行を仕込む。
 *   CI では supabase start した実インスタンスに対して走る
 * - プリフェッチは本番ビルドでしか動かないので、ここで見るのは
 *   「スピナーが出ない」「レイアウト（全件取得）を取り直さない」「タグ切替は通信ゼロ」の3点
 */
const SESSION_COOKIE = "authjs.session-token";

const userId = randomUUID();
const userEmail = `e2e-${userId}@example.com`;

const adminDb = (schema: "public" | "next_auth") =>
  createClient(WEB_SERVER_ENV.SUPABASE_URL, WEB_SERVER_ENV.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    db: { schema },
  });

test.beforeAll(async () => {
  const { error: userError } = await adminDb("next_auth")
    .from("users")
    .insert({ id: userId, email: userEmail, name: "E2E" });
  expect(userError, userError?.message).toBeNull();

  const { error: promptError } = await adminDb("public")
    .from("prompts")
    .insert([
      { owner_id: userId, title: "通常のプロンプト", body: "本文A", tags: ["e2e"] },
      { owner_id: userId, title: "タグ無しのプロンプト", body: "本文B", tags: [] },
      {
        owner_id: userId,
        title: "アーカイブ済み",
        body: "本文C",
        tags: [],
        archived_at: new Date().toISOString(),
      },
    ]);
  expect(promptError, promptError?.message).toBeNull();
});

test.afterAll(async () => {
  // prompts は ON DELETE CASCADE で消える
  await adminDb("next_auth").from("users").delete().eq("id", userId);
});

test.beforeEach(async ({ context }) => {
  const value = await encode({
    token: { uid: userId, sub: userId, role: "user", email: userEmail, name: "E2E" },
    secret: WEB_SERVER_ENV.AUTH_SECRET,
    salt: SESSION_COOKIE,
  });
  await context.addCookies([
    { name: SESSION_COOKIE, value, domain: "localhost", path: "/", httpOnly: true, sameSite: "Lax" },
  ]);
});

/** role="status"（読み込み中スピナー）が一瞬でも DOM に足されたら記録する。 */
async function armSpinnerDetector(page: Page) {
  await page.evaluate(() => {
    const w = window as unknown as { __spinnerSeen: boolean };
    w.__spinnerSeen = false;
    new MutationObserver((records) => {
      for (const record of records) {
        for (const node of record.addedNodes) {
          if (!(node instanceof Element)) continue;
          if (node.matches('[role="status"]') || node.querySelector('[role="status"]')) {
            w.__spinnerSeen = true;
          }
        }
      }
    }).observe(document.body, { childList: true, subtree: true });
  });
}

const spinnerSeen = (page: Page) =>
  page.evaluate(() => (window as unknown as { __spinnerSeen: boolean }).__spinnerSeen);

/** 遷移中に飛んだ、このアプリ宛ての通信（RSC / ドキュメント）を集める。 */
function collectAppRequests(page: Page) {
  const seen: { url: string; rsc: boolean; navigation: boolean }[] = [];
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.origin !== "http://localhost:3000") return;
    if (url.pathname.startsWith("/_next/") || url.pathname.startsWith("/__nextjs")) return;
    // URL が変わるとブラウザが favicon を取り直す。アプリの通信ではないので数えない
    if (url.pathname === "/favicon.ico") return;
    seen.push({
      url: url.pathname + url.search,
      rsc: request.headers()["rsc"] === "1",
      navigation: request.isNavigationRequest(),
    });
  });
  return seen;
}

test.describe("プロンプト画面のナビゲーション（ログイン済み）", () => {
  test("ビュー切り替えはスピナーを出さず、page セグメントだけを取りに行く", async ({ page }) => {
    await page.goto("/prompts");
    await expect(page.getByRole("heading", { name: "通常のプロンプト" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "アーカイブ済み" })).toHaveCount(0);

    await armSpinnerDetector(page);
    const requests = collectAppRequests(page);

    await page.getByRole("link", { name: "アーカイブ" }).click();
    await page.waitForURL("**/prompts/archive");
    await expect(page.getByRole("heading", { name: "アーカイブ済み" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "通常のプロンプト" })).toHaveCount(0);

    expect(await spinnerSeen(page)).toBe(false);
    // ドキュメントごと取り直していない（クライアント遷移）
    expect(requests.filter((r) => r.navigation)).toEqual([]);
    // 取りに行ったのは行き先の page セグメントだけ。/prompts（layout 側）は再要求されない
    const rsc = requests.filter((r) => r.rsc);
    expect(rsc.length).toBeLessThanOrEqual(1);
    for (const r of rsc) expect(r.url).toMatch(/^\/prompts\/archive(\?|$)/);
  });

  test("通常ビュー内のタグ絞り込みは通信なしで切り替わる", async ({ page }) => {
    await page.goto("/prompts");
    await expect(page.getByRole("heading", { name: "タグ無しのプロンプト" })).toBeVisible();

    const requests = collectAppRequests(page);

    await page.getByRole("link", { name: /^e2e/ }).click();
    await page.waitForURL("**/prompts?tag=e2e");
    await expect(page.getByRole("heading", { name: "通常のプロンプト" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "タグ無しのプロンプト" })).toHaveCount(0);

    await page.getByRole("link", { name: "すべて" }).click();
    await page.waitForURL("**/prompts");
    await expect(page.getByRole("heading", { name: "タグ無しのプロンプト" })).toBeVisible();

    expect(requests).toEqual([]);
  });

  test("アーカイブからのタグ選択は通常ビューへ遷移して絞り込む", async ({ page }) => {
    await page.goto("/prompts/archive");
    await expect(page.getByRole("heading", { name: "アーカイブ済み" })).toBeVisible();

    await page.getByRole("link", { name: /^e2e/ }).click();
    await page.waitForURL("**/prompts?tag=e2e");
    await expect(page.getByRole("heading", { name: "通常のプロンプト" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "アーカイブ済み" })).toHaveCount(0);
  });
});
