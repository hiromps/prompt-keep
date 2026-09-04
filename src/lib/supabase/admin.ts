import "server-only";
import { createClient } from "@supabase/supabase-js";
import { serverEnv } from "@/lib/env";
import type { Database } from "@/lib/supabase/database.types";

/**
 * admin client（service role key）。RLS をバイパスする。
 *
 * - `server-only` により Client Component から import するとビルドエラーになる
 * - 使用前に必ず auth() で認証・権限・所有権を検証すること（src/actions/safe-action.ts 参照）
 * - service role key を戻り値やログへ含めないこと
 */
export function createAdminClient() {
  return createClient<Database>(
    serverEnv.SUPABASE_URL,
    serverEnv.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
}
