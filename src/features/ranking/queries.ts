import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { AppError } from "@/lib/errors";

/**
 * ★ログインなしで DB の中身を返す経路（3 本のうちの 1 本。docs/decisions/0009）★
 *
 * /ranking だけがここを呼ぶ。読む先はビュー `shared_prompt_ranking` で、
 * 返してよい列は DB 側で閉じてある（id / owner_id は無く、本文は冒頭 120 文字だけ）。
 * 列を足したくなったら migration でビューを変えること。ここに別テーブルを join しない。
 */

/** 未ログインで見られる件数と、ログイン時の上限 */
export const RANKING_PUBLIC_LIMIT = 10;
export const RANKING_MAX_LIMIT = 100;

export type RankingEntry = {
  rank: number;
  token: string;
  copyCount: number;
  title: string;
  snippet: string;
  tags: string[];
};

/**
 * コピー数の多い順に共有プロンプトを返す。
 * 同数のときは先にコピーされ始めた（last_copied_at が古い）ものを上にする。
 */
export async function listRanking(limit: number): Promise<RankingEntry[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("shared_prompt_ranking")
    .select("token, copy_count, title, snippet, tags")
    .order("copy_count", { ascending: false })
    .order("last_copied_at", { ascending: true })
    .limit(Math.min(limit, RANKING_MAX_LIMIT));

  if (error) {
    throw new AppError("INTERNAL", "ランキングの取得に失敗しました", { cause: error });
  }

  // ビューの列は生成型で nullable になるが、定義上 NULL にはならない
  return (data ?? []).flatMap((row, i) =>
    row.token && row.copy_count !== null
      ? [
          {
            rank: i + 1,
            token: row.token,
            copyCount: row.copy_count,
            title: row.title ?? "",
            snippet: row.snippet ?? "",
            tags: row.tags ?? [],
          },
        ]
      : [],
  );
}
