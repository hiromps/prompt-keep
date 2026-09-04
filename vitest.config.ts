import path from "node:path";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    include: ["tests/unit/**/*.test.{ts,tsx}"],
    environment: "node",
    env: {
      // env.ts の検証を通すためのダミー値（実接続はしない）
      SUPABASE_URL: "http://127.0.0.1:54321",
      SUPABASE_ANON_KEY: "test-anon-key",
      SUPABASE_SERVICE_ROLE_KEY: "test-service-role-key",
      AUTH_SECRET: "test-auth-secret-at-least-32-characters!!",
      AUTH_GOOGLE_ID: "test-google-id",
      AUTH_GOOGLE_SECRET: "test-google-secret",
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@config": path.resolve(__dirname, "./project.config.ts"),
      // React Server Components 専用マーカーをテストでは無効化する
      "server-only": path.resolve(__dirname, "./tests/unit/stubs/server-only.ts"),
    },
  },
});
