import "server-only";
import { z } from "zod";

/**
 * サーバー専用環境変数。
 * import 時に検証し、欠落があれば起動時に即失敗させる（fail-fast）。
 * このモジュールは server-only のため、Client Component から import するとビルドエラーになる。
 */
const serverEnvSchema = z.object({
  // Supabase（PostgreSQL として使用。Supabase Auth は使わない）
  SUPABASE_URL: z.url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  SUPABASE_ANON_KEY: z.string().min(1),
  // Auth.js（JWT 署名鍵。短い鍵はセッション偽造に直結するため 32 文字以上を強制）
  AUTH_SECRET: z.string().min(32, "AUTH_SECRET は32文字以上（openssl rand -base64 32 で生成）"),
  AUTH_GOOGLE_ID: z.string().min(1),
  AUTH_GOOGLE_SECRET: z.string().min(1),
});

export const serverEnv = serverEnvSchema.parse({
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
  AUTH_SECRET: process.env.AUTH_SECRET,
  AUTH_GOOGLE_ID: process.env.AUTH_GOOGLE_ID,
  AUTH_GOOGLE_SECRET: process.env.AUTH_GOOGLE_SECRET,
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;
