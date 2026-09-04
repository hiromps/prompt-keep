import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { serverEnv } from "@/lib/env";
import type { Database } from "@/lib/supabase/database.types";

/**
 * admin client（service role key）。RLS をバイパスする。
 *
 * - `server-only` により Client Component から import するとビルドエラーになる
 * - 使用前に必ず auth() で認証・権限・所有権を検証すること（src/actions/safe-action.ts 参照）
 * - service role key を戻り値やログへ含めないこと
 *
 * プロセス内で1つを使い回す。service role 固定でユーザーごとの状態を持たないため
 * 共有して差し支えなく、クエリのたびに PostgREST / Realtime / Storage の
 * サブクライアントを組み立て直す無駄を省ける。
 */
let client: SupabaseClient<Database> | undefined;

export function createAdminClient(): SupabaseClient<Database> {
  client ??= createClient<Database>(serverEnv.SUPABASE_URL, serverEnv.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}
