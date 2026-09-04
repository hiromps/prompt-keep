import { test, expect } from "@playwright/test";

test.describe("公開ページ", () => {
  test("LPが表示され、ログイン導線がある", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "プロンプトを、探さない" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Googleで始める" })).toBeVisible();
  });

  test("サインインページに Google ログインボタンがある", async ({ page }) => {
    await page.goto("/signin");
    await expect(page.getByRole("button", { name: "Googleでログイン" })).toBeVisible();
  });

  test("unauthorized ページが表示される", async ({ page }) => {
    await page.goto("/unauthorized");
    await expect(page.getByRole("heading", { name: "権限がありません" })).toBeVisible();
  });

  test("存在しないページは not-found を表示する", async ({ page }) => {
    await page.goto("/no-such-page");
    await expect(page.getByRole("heading", { name: "ページが見つかりません" })).toBeVisible();
  });

  // /s/<token> はログイン不要でデータを出す唯一の経路。
  // 「知らないトークンは中身も存在も返さない」ことをここで固定する。
  test("知らない共有トークンは 404 になる", async ({ page }) => {
    const response = await page.goto("/s/Ab3-_zZ9Ab3-_zZ9Ab3-_zZ9Ab3-_zZ9");
    expect(response?.status()).toBe(404);
    await expect(page.getByRole("heading", { name: "ページが見つかりません" })).toBeVisible();
  });

  test("形式が不正な共有トークンも 404 になる", async ({ page }) => {
    const response = await page.goto("/s/short");
    expect(response?.status()).toBe(404);
  });

  test("認証エラーページが表示される", async ({ page }) => {
    await page.goto("/auth-error?error=AccessDenied");
    await expect(page.getByText("アクセスが拒否されました。")).toBeVisible();
  });
});
