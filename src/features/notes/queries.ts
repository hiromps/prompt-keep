import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { AppError } from "@/lib/errors";

export type Note = {
  id: string;
  owner_id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
};

/** 自分のノートのみを一覧する（owner_id でスコープ）。 */
export async function listNotesByOwner(ownerId: string): Promise<Note[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("notes")
    .select("id, owner_id, title, content, created_at, updated_at")
    .eq("owner_id", ownerId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new AppError("INTERNAL", "ノートの取得に失敗しました", { cause: error });
  }
  return data ?? [];
}
