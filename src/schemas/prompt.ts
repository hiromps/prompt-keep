import { z } from "zod";

/** タグ1個あたりの最大文字数。 */
export const MAX_TAG_LENGTH = 30;
/** 1プロンプトあたりのタグ上限（DB 側の CHECK cardinality(tags) <= 20 と揃える）。 */
export const MAX_TAGS = 20;
/** 本文の上限。プロンプトは長くなりがちなので広めに取る。 */
export const MAX_BODY_LENGTH = 20000;

/**
 * 日本語の表記ゆれを吸収するための正規化。
 * 全角/半角の英数字・カタカナを NFKC で揃えたうえで小文字化する。
 * タグの重複判定と検索の突き合わせで同じ関数を使う。
 */
export function foldForMatch(value: string): string {
  return value.normalize("NFKC").toLowerCase();
}

/**
 * タグ入力文字列を正規化済みの配列にする。
 *
 * フォームからは「区切り文字入りの1本の文字列」として届く。
 * name="tags" を複数投げる方式にしないのは、formDataToObject が
 * 「1個なら文字列 / 複数なら配列」を返すため、タグ1個のときだけ型が変わるから。
 *
 * 区切りは日本語入力を考慮して半角/全角カンマ・読点・空白すべてを受ける。
 * 表示は入力された表記のまま残し、重複判定だけ NFKC + 小文字で行う。
 */
export function normalizeTags(raw: string): string[] {
  const tags: string[] = [];
  const seen = new Set<string>();

  for (const part of raw.split(/[,、，\s]+/)) {
    const tag = part.trim().slice(0, MAX_TAG_LENGTH);
    if (!tag) continue;
    const key = foldForMatch(tag);
    if (seen.has(key)) continue;
    seen.add(key);
    tags.push(tag);
    if (tags.length >= MAX_TAGS) break;
  }
  return tags;
}

/**
 * 本文の改行を LF に揃える。
 * Windows のブラウザは textarea を CRLF で送るため、
 * そのまま保存するとコピーしてターミナルや他ツールへ貼ったときに CR が混ざる。
 */
function normalizeNewlines(value: string): string {
  return value.replace(/\r\n/g, "\n");
}

/**
 * 共有トークン（/s/<token>）の形。randomBytes(24) の base64url = 32文字を発行するが、
 * 長さを固定で縛らず幅を持たせている（将来バイト数を変えても既存リンクが死なないように）。
 *
 * DB へ問い合わせる前にここで弾く。URL の一部がそのままクエリに入る唯一の経路なので、
 * 想定外の文字列を先に落としておく。
 */
const SHARE_TOKEN_PATTERN = /^[A-Za-z0-9_-]{16,64}$/;

export function isShareToken(value: string): boolean {
  return SHARE_TOKEN_PATTERN.test(value);
}

const idField = z.uuid("プロンプトIDが不正です");

/** 状態変更系アクションが共通で使う id だけのスキーマ。 */
export const promptIdSchema = z.object({ id: idField });

/**
 * ピン留め / アーカイブの切り替え。
 * 「反転」ではなく「これから何になるか」を受け取る。
 * Supabase JS では SET is_pinned = NOT is_pinned を1クエリで書けず、
 * 読んでから書く方式は連打で自分自身と競合するため。
 */
export const promptFlagSchema = z.object({
  id: idField,
  value: z.enum(["true", "false"]).transform((v) => v === "true"),
});

export const createPromptSchema = z
  .object({
    // タイトルは任意。本文だけで保存できる（見出しは本文1行目から作る）
    title: z.string().trim().max(100, "タイトルは100文字以内で入力してください").default(""),
    body: z
      .string()
      .max(MAX_BODY_LENGTH, `本文は${MAX_BODY_LENGTH}文字以内で入力してください`)
      .default("")
      .transform(normalizeNewlines),
    tags: z.string().default("").transform(normalizeTags),
  })
  .refine((v) => v.title.length > 0 || v.body.trim().length > 0, {
    message: "タイトルか本文のどちらかを入力してください",
    path: ["body"],
  });

export const updatePromptSchema = z.object({
  id: idField,
  title: z.string().trim().max(100, "タイトルは100文字以内で入力してください").default(""),
  body: z
    .string()
    .max(MAX_BODY_LENGTH, `本文は${MAX_BODY_LENGTH}文字以内で入力してください`)
    .default("")
    .transform(normalizeNewlines),
  tags: z.string().default("").transform(normalizeTags),
});

export type CreatePromptInput = z.infer<typeof createPromptSchema>;
export type UpdatePromptInput = z.infer<typeof updatePromptSchema>;
export type PromptIdInput = z.infer<typeof promptIdSchema>;
export type PromptFlagInput = z.infer<typeof promptFlagSchema>;
