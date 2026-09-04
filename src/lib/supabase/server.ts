import "server-only";
import { createClient } from "@supabase/supabase-js";
import { serverEnv } from "@/lib/env";
import type { Database } from "@/lib/supabase/database.types";

/**
 * server client（anon key・サーバー専用）。
 *
 * RLS の制約下で動作する。Core のテーブルは「ポリシーなし = 全拒否」のため、
 * このクライアントで読めるのは明示的に公開ポリシーを付けたテーブルのみ。
 * 認証済みユーザーのデータ操作には admin client（admin.ts）+ サーバー側権限検証を使う。
 */
export function createServerClient() {
  return createClient<Database>(serverEnv.SUPABASE_URL, serverEnv.SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
