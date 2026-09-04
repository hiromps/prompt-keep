import { defineConfig, devices } from "@playwright/test";

/**
 * E2E テスト設定。
 * 認証リダイレクトと公開ページはダミー環境変数だけで検証できる
 * （実際に Google OAuth / Supabase へ接続するのはログイン操作を行うときのみ）。
 *
 * WEB_SERVER_ENV はテストからも import される（サーバーが実際に起動した値で
 * service role key の非露出を検証するため）。
 */
export const WEB_SERVER_ENV = {
  SUPABASE_URL: process.env.SUPABASE_URL ?? "http://127.0.0.1:54321",
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY ?? "e2e-dummy-anon-key",
  SUPABASE_SERVICE_ROLE_KEY:
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? "e2e-dummy-service-role-key",
  AUTH_SECRET: process.env.AUTH_SECRET ?? "e2e-dummy-auth-secret-32-characters!!",
  AUTH_GOOGLE_ID: process.env.AUTH_GOOGLE_ID ?? "e2e-dummy-google-id",
  AUTH_GOOGLE_SECRET: process.env.AUTH_GOOGLE_SECRET ?? "e2e-dummy-google-secret",
};

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  // dev サーバーの初回コンパイル遅延を吸収する
  expect: { timeout: 15_000 },
  reporter: process.env.CI
    ? [["github"], ["html", { open: "never" }]]
    : "list",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "pnpm dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: WEB_SERVER_ENV,
  },
});
