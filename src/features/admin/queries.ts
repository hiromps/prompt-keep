import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { AppError } from "@/lib/errors";

export type AdminProfileRow = {
  id: string;
  auth_user_id: string;
  display_name: string;
  role: string;
  status: string;
  created_at: string;
};

/**
 * 全ユーザーのプロフィール一覧（管理者専用）。
 * 呼び出し側で必ず requireAdmin() を通すこと。
 */
export async function listAllProfiles(): Promise<AdminProfileRow[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, auth_user_id, display_name, role, status, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    throw new AppError("INTERNAL", "ユーザー一覧の取得に失敗しました", { cause: error });
  }
  return data ?? [];
}
