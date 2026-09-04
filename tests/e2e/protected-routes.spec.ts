import { test, expect } from "@playwright/test";
import { WEB_SERVER_ENV } from "../../playwright.config";

/**
 * 未認証ユーザーが保護ルートへアクセスできないことの検証（完了条件）。
 * ログイン済みフローは Google OAuth の実クレデンシャルが必要なため、
 * ローカルでの手動検証手順を docs/implementation-status.md に記載している。
 */
test.describe("保護ルート（未認証）", () => {
  for (const path of ["/dashboard", "/profile", "/admin"]) {
    test(`${path} は callbackUrl 付きでサインインへリダイレクトされる`, async ({ page }) => {
      await page.goto(path);
      await page.waitForURL("**/signin**");
      expect(new URL(page.url()).searchParams.get("callbackUrl")).toBe(path);
      await expect(page.getByRole("button", { name: "Googleでログイン" })).toBeVisible();
    });
  }

  test("service role key がブラウザへ露出しない", async ({ page }) => {
    // サーバーが実際に起動した値で検証する（実キー環境でも空振りしない）
    const serviceRoleKey = WEB_SERVER_ENV.SUPABASE_SERVICE_ROLE_KEY;
    expect(serviceRoleKey.length).toBeGreaterThan(0);

    const bodyPromises: Promise<string>[] = [];
    page.on("response", (response) => {
      const type = response.headers()["content-type"] ?? "";
      if (type.includes("javascript") || type.includes("html")) {
        bodyPromises.push(response.text().catch(() => ""));
      }
    });
    await page.goto("/");
    await page.goto("/signin");
    await page.waitForLoadState("networkidle");

    const bodies = await Promise.all(bodyPromises);
    expect(bodies.length).toBeGreaterThan(0);
    for (const body of bodies) {
      expect(body).not.toContain(serviceRoleKey);
    }
  });
});
