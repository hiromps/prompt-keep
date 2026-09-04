import { foldForMatch } from "@/schemas/prompt";

/** DB の prompts 1行。Server / Client のどちらからも参照する。 */
export type Prompt = {
  id: string;
  owner_id: string;
  title: string;
  body: string;
  tags: string[];
  is_pinned: boolean;
  archived_at: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
};

/** 表示ビュー。プロンプトの3状態と1対1で対応する。 */
export type PromptView = "active" | "archived" | "trashed";

/** 1件がどのビューに属するかを判定する（ゴミ箱はアーカイブより優先）。 */
export function viewOf(prompt: Prompt): PromptView {
  if (prompt.deleted_at) return "trashed";
  if (prompt.archived_at) return "archived";
  return "active";
}

/** タイトル未設定なら本文の1行目を見出しとして使う。 */
export function displayTitle(prompt: Prompt): string {
  if (prompt.title) return prompt.title;
  const firstLine = prompt.body.split("\n").find((line) => line.trim().length > 0);
  return firstLine?.trim().slice(0, 60) ?? "（無題）";
}

export type TagCount = { tag: string; count: number };

/**
 * 通常ビューの行からタグ一覧と件数を作る。
 * 表記ゆれ（全角/半角・大文字小文字）は同じタグとして数え、
 * 表示ラベルには最初に現れた表記を使う。
 */
export function tagCounts(prompts: Prompt[]): TagCount[] {
  const byKey = new Map<string, TagCount>();
  for (const prompt of prompts) {
    for (const tag of prompt.tags) {
      const key = foldForMatch(tag);
      const existing = byKey.get(key);
      if (existing) existing.count += 1;
      else byKey.set(key, { tag, count: 1 });
    }
  }
  return [...byKey.values()].sort(
    (a, b) => b.count - a.count || a.tag.localeCompare(b.tag, "ja"),
  );
}

/** タグが一致するか（表記ゆれを吸収する）。 */
export function hasTag(prompt: Prompt, tag: string): boolean {
  const key = foldForMatch(tag);
  return prompt.tags.some((t) => foldForMatch(t) === key);
}

/**
 * フリーワード検索。タイトル・本文・タグを横断する。
 * 突き合わせは NFKC + 小文字化した文字列同士で行う。
 */
export function matchesQuery(prompt: Prompt, query: string): boolean {
  const needle = foldForMatch(query.trim());
  if (!needle) return true;
  const haystack = foldForMatch(
    [prompt.title, prompt.body, prompt.tags.join(" ")].join("\n"),
  );
  return haystack.includes(needle);
}
