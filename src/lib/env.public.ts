import { z } from "zod";

/**
 * ブラウザへ公開してよい環境変数（NEXT_PUBLIC_ のみ）。
 * Optional module（realtime / storage 等）で browser client を使う場合にのみ必要。
 * Core では未設定でもよいよう、このモジュールは browser client からのみ import する。
 */
const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
});

export const publicEnv = publicEnvSchema.parse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
});
