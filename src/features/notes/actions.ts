"use server";

import { revalidatePath } from "next/cache";
import { createAuthAction } from "@/actions/safe-action";
import { createNoteSchema, updateNoteSchema, deleteNoteSchema } from "@/schemas/note";
import { createAdminClient } from "@/lib/supabase/admin";
import { AppError } from "@/lib/errors";

export const createNote = createAuthAction(
  "notes.create",
  createNoteSchema,
  async (input, { user }) => {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("notes")
      .insert({ owner_id: user.id, title: input.title, content: input.content })
      .select("id")
      .single();

    if (error) {
      throw new AppError("INTERNAL", "ノートの作成に失敗しました", { cause: error });
    }

    revalidatePath("/dashboard");
    return { id: data.id };
  },
);

export const updateNote = createAuthAction(
  "notes.update",
  updateNoteSchema,
  async (input, { user }) => {
    const supabase = createAdminClient();
    // 所有権の検証: owner_id = 自分 の行だけを更新対象にする
    const { data, error } = await supabase
      .from("notes")
      .update({ title: input.title, content: input.content })
      .eq("id", input.id)
      .eq("owner_id", user.id)
      .select("id")
      .maybeSingle();

    if (error) {
      throw new AppError("INTERNAL", "ノートの更新に失敗しました", { cause: error });
    }
    if (!data) {
      // 存在しない or 他人のノート。情報を漏らさないため同一メッセージにする
      throw new AppError("NOT_FOUND", "ノートが見つかりません");
    }

    revalidatePath("/dashboard");
    return { id: data.id };
  },
);

export const deleteNote = createAuthAction(
  "notes.delete",
  deleteNoteSchema,
  async (input, { user }) => {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("notes")
      .delete()
      .eq("id", input.id)
      .eq("owner_id", user.id)
      .select("id")
      .maybeSingle();

    if (error) {
      throw new AppError("INTERNAL", "ノートの削除に失敗しました", { cause: error });
    }
    if (!data) {
      throw new AppError("NOT_FOUND", "ノートが見つかりません");
    }

    revalidatePath("/dashboard");
    return { id: data.id };
  },
);
