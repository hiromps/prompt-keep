import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { AppError } from "@/lib/errors";

export type Profile = {
  id: string;
  auth_user_id: string;
  display_name: string;
  avatar_url: string | null;
  role: string;
  status: string;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
};

/** 呼び出し側で認証済みであることが前提（(protected) layout / requireUser 経由）。 */
export async function getProfileByAuthUserId(authUserId: string): Promise<Profile | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("profiles")
    .select(
      "id, auth_user_id, display_name, avatar_url, role, status, onboarding_completed, created_at, updated_at",
    )
    .eq("auth_user_id", authUserId)
    .maybeSingle();

  if (error) {
    throw new AppError("INTERNAL", "プロフィールの取得に失敗しました", { cause: error });
  }
  return data;
}
