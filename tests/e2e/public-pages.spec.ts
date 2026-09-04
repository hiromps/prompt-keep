import { test, expect } from "@playwright/test";

test.describe("公開ページ", () => {
  test("LPが表示され、ログイン導線がある", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "MVPを、今日はじめる" })).toBeVisible();
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

  test("認証エラーページが表示される", async ({ page }) => {
    await page.goto("/auth-error?error=AccessDenied");
    await expect(page.getByText("アクセスが拒否されました。")).toBeVisible();
  });
});
