import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { AppError } from "@/lib/errors";
import { isShareToken } from "@/schemas/prompt";

/**
 * ★このファイルはアプリで唯一「ログインなしで DB の中身を返す」経路★
 *
 * /s/<token> の公開ページだけがここを呼ぶ。読み手は認証されていないので、
 * 返す列は下の SHARED_COLUMNS に固定し、意図的に閉じている。
 * owner_id / id / is_pinned / archived_at などを足さないこと。
 * それらは共有相手に見せる必要がなく、id を渡すと共有していない他の行を
 * 推測する手掛かりになる。
 *
 * アクセス制御は token の推測不可能性そのもの（24バイト乱数）。
 * したがって「該当なし」「停止済み」「ゴミ箱行き」はすべて同じ null を返し、
 * 呼び出し側で 404 にする。区別を返すと、停止済みリンクの存在が確認できてしまう。
 */
const SHARED_COLUMNS = "title, body, tags, updated_at";

/** 公開ページに出す内容。所有者を特定できる情報は含めない。 */
export type SharedPrompt = {
  title: string;
  body: string;
  tags: string[];
  updated_at: string;
};

/**
 * 共有トークンからプロンプトを引く。**認証は行わない（意図的）**。
 *
 * 有効な共有（revoked_at IS NULL）で、かつ元のプロンプトがゴミ箱に入っていない
 * 場合だけ本文を返す。アーカイブ済みは返す——アーカイブは持ち主の整理都合であって
 * 「共有をやめた」という意思表示ではないため。
 */
export async function getSharedPrompt(token: string): Promise<SharedPrompt | null> {
  if (!isShareToken(token)) return null;

  const supabase = createAdminClient();

  const { data: share, error: shareError } = await supabase
    .from("prompt_shares")
    .select("prompt_id")
    .eq("token", token)
    .is("revoked_at", null)
    .maybeSingle();

  if (shareError) {
    throw new AppError("INTERNAL", "共有プロンプトの取得に失敗しました", { cause: shareError });
  }
  if (!share) return null;

  const { data: prompt, error: promptError } = await supabase
    .from("prompts")
    .select(SHARED_COLUMNS)
    .eq("id", share.prompt_id)
    .is("deleted_at", null)
    .maybeSingle();

  if (promptError) {
    throw new AppError("INTERNAL", "共有プロンプトの取得に失敗しました", { cause: promptError });
  }
  return prompt;
}
