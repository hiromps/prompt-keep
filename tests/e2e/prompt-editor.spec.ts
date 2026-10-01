import { randomUUID } from "node:crypto";
import { test, expect, type Locator, type Page } from "@playwright/test";
import { encode } from "@auth/core/jwt";
import { WEB_SERVER_ENV } from "../../playwright.config";

/**
 * 編集モーダルとクイック入力の「閉じる」と「保存」を固定する。
 *
 * PC で本文をドラッグで選択しながらモーダルの外へ出てボタンを離すと、click は
 * 押した要素と離した要素の共通の祖先（<dialog> 自身）に届く。これが背景クリックと
 * 誤認されてモーダルが閉じ、書きかけが保存されずに消えていた。ここで確かめるのは
 * - 選択しながら外で離しても閉じない（選択も残る）
 * - 意図して閉じる操作（背景のクリック / Esc）は保存してから閉じる
 * - 変更を捨てるのは「キャンセル」だけ
 * - 保存できないとき（通信断）は閉じずにエラーを出し、内容を残す
 *
 * セッション Cookie の作り方とデータの仕込み方は prompts-navigation.spec.ts と同じ
 * （uid 入りの JWT を encode し、service role で PostgREST へ直接 INSERT する）。
 */
const SESSION_COOKIE = "authjs.session-token";

const userId = randomUUID();
const userEmail = `e2e-editor-${userId}@example.com`;

async function postgrest(method: "POST" | "DELETE", schema: string, table: string, query = "", body?: unknown) {
  const key = WEB_SERVER_ENV.SUPABASE_SERVICE_ROLE_KEY;
  const res = await fetch(`${WEB_SERVER_ENV.SUPABASE_URL}/rest/v1/${table}${query}`, {
    method,
    headers: {
      apikey: key,
      authorization: `Bearer ${key}`,
      "content-type": "application/json",
      "content-profile": schema,
      prefer: "return=minimal",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${method} ${schema}.${table}: ${res.status} ${await res.text()}`);
}

test.beforeAll(async () => {
  await postgrest("POST", "next_auth", "users", "", { id: userId, email: userEmail, name: "E2E" });
  // テストごとに別の行を触る（fullyParallel で同じワーカーの別テストと混ざらないように）
  await postgrest(
    "POST",
    "public",
    "prompts",
    "",
    ["ドラッグ選択", "Esc で保存", "キャンセル", "通信断"].map((title, i) => ({
      owner_id: userId,
      title,
      body: `本文${i + 1}`,
      tags: [],
    })),
  );
});

test.afterAll(async () => {
  // prompts は ON DELETE CASCADE で消える
  await postgrest("DELETE", "next_auth", "users", `?id=eq.${userId}`);
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

const editorOf = (page: Page) => page.getByRole("dialog", { name: "プロンプトを編集" });

/** カードの本文をクリックして編集を開き、開くアニメーションが終わるまで待つ */
async function openByBody(page: Page, body: string): Promise<{ dialog: Locator; textarea: Locator }> {
  await page.getByText(body, { exact: true }).click();
  const dialog = editorOf(page);
  const textarea = dialog.getByRole("textbox", { name: "プロンプト本文" });
  await expect(textarea).toBeFocused();
  await dialog.evaluate((el) => Promise.all(el.getAnimations().map((a) => a.finished)));
  return { dialog, textarea };
}

test.describe("編集モーダルの閉じる・保存（ログイン済み）", () => {
  test("本文を選択しながら外で離しても閉じず、背景をクリックすると保存して閉じる", async ({ page }) => {
    await page.goto("/prompts");
    const { dialog, textarea } = await openByBody(page, "本文1");
    await page.keyboard.type("（追記）");

    // 本文の中で押し、選択しながらモーダルの外まで動かして離す
    const text = (await textarea.boundingBox())!;
    const box = (await dialog.boundingBox())!;
    await page.mouse.move(text.x + 8, text.y + 8);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width + 60, box.y + box.height + 40, { steps: 10 });
    await page.mouse.up();

    // 閉じるアニメーション（200ms）の途中はまだ見えているので、すぐに見ると誤って閉じていても通ってしまう。
    // アニメーションより長く待ってから、開いたままであることを確かめる
    await page.waitForTimeout(600);
    await expect(dialog).toBeVisible();
    const selected = await textarea.evaluate(
      (el) => (el as HTMLTextAreaElement).selectionEnd - (el as HTMLTextAreaElement).selectionStart,
    );
    expect(selected).toBeGreaterThan(0);

    // 意図した背景のクリックは閉じる操作。閉じる前に保存される
    await page.mouse.click(box.x - 30, box.y + box.height / 2);
    await expect(dialog).toBeHidden();
    await page.reload();
    await expect(page.getByText("本文1（追記）", { exact: true })).toBeVisible();
  });

  test("Esc は保存して閉じ、キャンセルは変更を捨てる", async ({ page }) => {
    await page.goto("/prompts");
    let { dialog } = await openByBody(page, "本文2");
    await page.keyboard.type("（Esc）");
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();

    ({ dialog } = await openByBody(page, "本文3"));
    await page.keyboard.type("（捨てる）");
    await dialog.getByRole("button", { name: "キャンセル" }).click();
    await expect(dialog).toBeHidden();

    await page.reload();
    await expect(page.getByText("本文2（Esc）", { exact: true })).toBeVisible();
    await expect(page.getByText("本文3", { exact: true })).toBeVisible();
    await expect(page.getByText("本文3（捨てる）")).toHaveCount(0);
  });

  test("保存できないとき（通信断）は閉じずにエラーを出し、内容を残す", async ({ page, context }) => {
    await page.goto("/prompts");
    const { dialog, textarea } = await openByBody(page, "本文4");
    await page.keyboard.type("（通信断）");

    await context.setOffline(true);
    await page.keyboard.press("Escape");
    await expect(dialog.getByRole("alert")).toContainText("サーバーに接続できませんでした");
    await expect(dialog).toBeVisible();
    await expect(textarea).toHaveValue("本文4（通信断）");

    await context.setOffline(false);
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await page.reload();
    await expect(page.getByText("本文4（通信断）", { exact: true })).toBeVisible();
  });
});

test("クイック入力は書いて外側をクリックすると保存して畳む", async ({ page }) => {
  await page.goto("/prompts");
  await page.getByRole("button", { name: "プロンプトを追加…" }).click();
  await page.keyboard.type("外側のクリックで作成");

  // 入力欄の右の何もない所をクリックする
  const title = (await page.getByRole("textbox", { name: "タイトル" }).boundingBox())!;
  await page.mouse.click(title.x + title.width + 80, title.y + 8);

  await expect(page.getByRole("button", { name: "プロンプトを追加…" })).toBeVisible();
  await expect(page.getByText("外側のクリックで作成", { exact: true })).toBeVisible();
});
