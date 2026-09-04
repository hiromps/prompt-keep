"use server";

import { revalidatePath } from "next/cache";
import { createAuthAction } from "@/actions/safe-action";
import {
  createPromptSchema,
  updatePromptSchema,
  promptIdSchema,
  promptFlagSchema,
} from "@/schemas/prompt";
import { createAdminClient } from "@/lib/supabase/admin";
import { AppError } from "@/lib/errors";
import type { Database } from "@/lib/supabase/database.types";

type PromptPatch = Database["public"]["Tables"]["prompts"]["Update"];

/** 一覧はこの1ルートに集約されているので、更新後はここだけ再検証すればよい。 */
const PROMPTS_PATH = "/prompts";

function revalidatePrompts() {
  // 通常 / アーカイブ / ゴミ箱は同じセグメント配下なので layout ごと再検証する
  revalidatePath(PROMPTS_PATH, "layout");
}

/**
 * 所有権を必ず伴う更新。
 *
 * 状態変更アクションが6本あり、どれか1本で .eq("owner_id", ...) を書き忘れると
 * 他人の行を触れてしまう（アプリは service_role で接続するため RLS は素通りする）。
 * 経路をこの関数1つに絞ることで、書き忘れを構造的に不可能にする。
 */
async function updateOwnedPrompt(
  id: string,
  ownerId: string,
  patch: PromptPatch,
  failureMessage: string,
): Promise<{ id: string }> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("prompts")
    .update(patch)
    .eq("id", id)
    .eq("owner_id", ownerId)
    .select("id")
    .maybeSingle();

  if (error) {
    throw new AppError("INTERNAL", failureMessage, { cause: error });
  }
  if (!data) {
    // 存在しない or 他人のプロンプト。情報を漏らさないため同一メッセージにする
    throw new AppError("NOT_FOUND", "プロンプトが見つかりません");
  }
  return { id: data.id };
}

export const createPrompt = createAuthAction(
  "prompts.create",
  createPromptSchema,
  async (input, { user }) => {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("prompts")
      .insert({
        owner_id: user.id,
        title: input.title,
        body: input.body,
        tags: input.tags,
      })
      .select("id")
      .single();

    if (error) {
      throw new AppError("INTERNAL", "プロンプトの作成に失敗しました", { cause: error });
    }

    revalidatePrompts();
    return { id: data.id };
  },
);

export const updatePrompt = createAuthAction(
  "prompts.update",
  updatePromptSchema,
  async (input, { user }) => {
    const result = await updateOwnedPrompt(
      input.id,
      user.id,
      { title: input.title, body: input.body, tags: input.tags },
      "プロンプトの更新に失敗しました",
    );
    revalidatePrompts();
    return result;
  },
);

/** ピン留めの設定/解除。反転ではなく「これから何になるか」を受け取る。 */
export const setPromptPinned = createAuthAction(
  "prompts.setPinned",
  promptFlagSchema,
  async (input, { user }) => {
    const result = await updateOwnedPrompt(
      input.id,
      user.id,
      { is_pinned: input.value },
      "ピン留めの変更に失敗しました",
    );
    revalidatePrompts();
    return result;
  },
);

/** アーカイブ / アーカイブ解除。Keep と同じくアーカイブ時はピン留めを外す。 */
export const setPromptArchived = createAuthAction(
  "prompts.setArchived",
  promptFlagSchema,
  async (input, { user }) => {
    const patch = input.value
      ? { archived_at: new Date().toISOString(), is_pinned: false }
      : { archived_at: null };
    const result = await updateOwnedPrompt(
      input.id,
      user.id,
      patch,
      "アーカイブの変更に失敗しました",
    );
    revalidatePrompts();
    return result;
  },
);

/** ゴミ箱へ入れる。archived_at は消さないので、復元すると元の場所へ戻る。 */
export const trashPrompt = createAuthAction(
  "prompts.trash",
  promptIdSchema,
  async (input, { user }) => {
    const result = await updateOwnedPrompt(
      input.id,
      user.id,
      { deleted_at: new Date().toISOString(), is_pinned: false },
      "ゴミ箱への移動に失敗しました",
    );
    revalidatePrompts();
    return result;
  },
);

/** ゴミ箱から戻す。deleted_at を消すだけで、アーカイブ由来ならアーカイブへ戻る。 */
export const restorePrompt = createAuthAction(
  "prompts.restore",
  promptIdSchema,
  async (input, { user }) => {
    const result = await updateOwnedPrompt(
      input.id,
      user.id,
      { deleted_at: null },
      "復元に失敗しました",
    );
    revalidatePrompts();
    return result;
  },
);

/** 完全削除。ゴミ箱に入っている行だけを対象にする（生きている行は NOT_FOUND）。 */
export const purgePrompt = createAuthAction(
  "prompts.purge",
  promptIdSchema,
  async (input, { user }) => {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("prompts")
      .delete()
      .eq("id", input.id)
      .eq("owner_id", user.id)
      .not("deleted_at", "is", null)
      .select("id")
      .maybeSingle();

    if (error) {
      throw new AppError("INTERNAL", "完全削除に失敗しました", { cause: error });
    }
    if (!data) {
      throw new AppError("NOT_FOUND", "プロンプトが見つかりません");
    }

    revalidatePrompts();
    return { id: data.id };
  },
);
