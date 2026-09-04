import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { AppError } from "@/lib/errors";
import type { Prompt } from "@/features/prompts/model";

const PROMPT_COLUMNS =
  "id, owner_id, title, body, tags, is_pinned, archived_at, deleted_at, created_at, updated_at";

/**
 * 自分のプロンプトを全件取得する（owner_id でスコープ）。
 *
 * ビューで絞らずに1クエリで取り切る。個人利用の件数では十分軽く、
 * サイドバーのタグ件数とクライアント側検索が常に全件を前提にできるため
 * （ビューごとに絞ると、アーカイブ画面でタグ件数が実態とずれる）。
 * 振り分けは呼び出し側が viewOf() で行う。
 */
export async function listPromptsByOwner(ownerId: string): Promise<Prompt[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("prompts")
    .select(PROMPT_COLUMNS)
    .eq("owner_id", ownerId)
    .order("is_pinned", { ascending: false })
    .order("updated_at", { ascending: false });

  if (error) {
    throw new AppError("INTERNAL", "プロンプトの取得に失敗しました", { cause: error });
  }
  return (data ?? []) as Prompt[];
}
