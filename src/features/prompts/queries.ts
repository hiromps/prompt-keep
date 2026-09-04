import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { AppError } from "@/lib/errors";
import type { Prompt } from "@/features/prompts/model";

const PROMPT_COLUMNS =
  "id, owner_id, title, body, tags, is_pinned, archived_at, deleted_at, created_at, updated_at";

/** prompts に有効な共有リンクをぶら下げて取る（停止済みは埋め込み側で除外する）。 */
const PROMPT_COLUMNS_WITH_SHARE = `${PROMPT_COLUMNS}, prompt_shares(token)`;

/**
 * 自分のプロンプトを全件取得する（owner_id でスコープ）。
 *
 * ビューで絞らずに1クエリで取り切る。個人利用の件数では十分軽く、
 * サイドバーのタグ件数とクライアント側検索が常に全件を前提にできるため
 * （ビューごとに絞ると、アーカイブ画面でタグ件数が実態とずれる）。
 * 振り分けは呼び出し側が viewOf() で行う。
 *
 * 共有リンクの有無はカードに印を出すために必要なので、同じクエリで一緒に取る。
 * prompt_shares 側の revoked_at フィルタは埋め込みリソースに対するもので、
 * 共有していないプロンプトも（空配列を伴って）そのまま返る。
 * 有効な共有は DB の部分ユニーク制約により1件以下になる。
 */
export async function listPromptsByOwner(ownerId: string): Promise<Prompt[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("prompts")
    .select(PROMPT_COLUMNS_WITH_SHARE)
    .eq("owner_id", ownerId)
    .is("prompt_shares.revoked_at", null)
    .order("is_pinned", { ascending: false })
    .order("updated_at", { ascending: false });

  if (error) {
    throw new AppError("INTERNAL", "プロンプトの取得に失敗しました", { cause: error });
  }

  const rows = (data ?? []) as unknown as (Omit<Prompt, "share_token"> & {
    prompt_shares: { token: string }[];
  })[];

  return rows.map(({ prompt_shares, ...prompt }) => ({
    ...prompt,
    share_token: prompt_shares[0]?.token ?? null,
  }));
}
