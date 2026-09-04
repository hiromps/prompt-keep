"use server";

import { revalidatePath } from "next/cache";
import { createAuthAction } from "@/actions/safe-action";
import { updateProfileSchema } from "@/schemas/profile";
import { createAdminClient } from "@/lib/supabase/admin";
import { AppError } from "@/lib/errors";

/** 自分のプロフィール（display_name）を更新する。auth_user_id で所有行のみ更新。 */
export const updateProfile = createAuthAction(
  "profile.update",
  updateProfileSchema,
  async (input, { user }) => {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("profiles")
      .update({ display_name: input.display_name })
      .eq("auth_user_id", user.id)
      .select("id, display_name")
      .maybeSingle();

    if (error) {
      throw new AppError("INTERNAL", "プロフィールの更新に失敗しました", { cause: error });
    }
    if (!data) {
      throw new AppError("NOT_FOUND", "プロフィールが見つかりません");
    }

    revalidatePath("/profile");
    return { display_name: data.display_name };
  },
);
