import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import { isAppRole, type AppRole } from "@/auth/roles";

/**
 * サインイン時に Auth.js ユーザー（next_auth.users）へ対応する
 * public.profiles 行を保証し、現在のロールを返す。
 *
 * 認証テーブル（Auth.js 管理）と事業データ（profiles）を分離するための同期点。
 * 既存プロフィールの display_name 等はユーザー編集値を尊重し、上書きしない。
 */
export async function ensureProfile(params: {
  authUserId: string;
  displayName?: string | null;
  avatarUrl?: string | null;
}): Promise<{ role: AppRole }> {
  const supabase = createAdminClient();

  const { data: existing, error: selectError } = await supabase
    .from("profiles")
    .select("id, role, status")
    .eq("auth_user_id", params.authUserId)
    .maybeSingle();

  if (selectError) {
    logger.error("profiles select failed", { authUserId: params.authUserId, code: selectError.code });
    throw new Error("Failed to load profile");
  }

  if (existing) {
    return { role: isAppRole(existing.role) ? existing.role : "user" };
  }

  const { data: inserted, error: insertError } = await supabase
    .from("profiles")
    .insert({
      auth_user_id: params.authUserId,
      display_name: params.displayName ?? "",
      avatar_url: params.avatarUrl ?? null,
    })
    .select("role")
    .single();

  if (insertError) {
    // 同時サインインによる一意制約違反（23505）は再取得で回復する
    if (insertError.code === "23505") {
      const { data: retried, error: retryError } = await supabase
        .from("profiles")
        .select("role")
        .eq("auth_user_id", params.authUserId)
        .single();
      if (retryError || !retried) {
        // ここで黙って "user" に畳むと admin のロール降格 JWT が発行されうる。失敗は失敗として扱う
        logger.error("profiles retry select failed after conflict", {
          authUserId: params.authUserId,
          code: retryError?.code,
        });
        throw new Error("Failed to load profile after conflict");
      }
      return { role: isAppRole(retried.role) ? retried.role : "user" };
    }
    logger.error("profiles insert failed", { authUserId: params.authUserId, code: insertError.code });
    throw new Error("Failed to create profile");
  }

  return { role: isAppRole(inserted.role) ? inserted.role : "user" };
}
