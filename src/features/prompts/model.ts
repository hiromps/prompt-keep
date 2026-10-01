import { foldForMatch, normalizeNewlines, normalizeTags } from "@/schemas/prompt";

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
  /**
   * 有効な共有リンクの token。共有していなければ null。
   * prompts 列ではなく prompt_shares からの導出値（queries.ts で合成する）。
   */
  share_token: string | null;
};

/** 表示ビュー。プロンプトの3状態と1対1で対応する。 */
export type PromptView = "active" | "archived" | "trashed";

/** 1件がどのビューに属するかを判定する（ゴミ箱はアーカイブより優先）。 */
export function viewOf(prompt: Prompt): PromptView {
  if (prompt.deleted_at) return "trashed";
  if (prompt.archived_at) return "archived";
  return "active";
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

/**
 * 入力中のプロンプト（クイック入力・編集モーダル）。
 * タグ欄で打ちかけている文字（Enter で確定する前）も持つ。
 */
export type PromptDraft = {
  title: string;
  body: string;
  tags: string[];
  /** タグ欄に打ちかけの文字。保存するときは確定済みのタグとして扱う */
  pendingTag: string;
};

export const EMPTY_DRAFT: PromptDraft = { title: "", body: "", tags: [], pendingTag: "" };

/**
 * 保存するタグ。打ちかけのタグも加える。
 * Esc や外側のクリックで閉じると、タグ欄の blur（ここで確定している）を通らないため。
 */
export function draftTags(draft: PromptDraft): string[] {
  if (!draft.pendingTag.trim()) return draft.tags;
  return normalizeTags([...draft.tags, draft.pendingTag].join(","));
}

/** 保存するものが無いか（createPromptSchema と同じく、タイトルか本文のどちらかが要る） */
export function isBlankDraft(draft: PromptDraft): boolean {
  return draft.title.trim() === "" && draft.body.trim() === "";
}

/**
 * 保存済みの内容から変わったか。サーバー側の正規化（タイトル前後の空白・改行コード）を
 * 揃えてから比べるので、保存しても結果が同じになる差分は「変更なし」になる。
 */
export function isDraftChanged(
  draft: PromptDraft,
  saved: Pick<Prompt, "title" | "body" | "tags">,
): boolean {
  return (
    draft.title.trim() !== saved.title.trim() ||
    normalizeNewlines(draft.body) !== normalizeNewlines(saved.body) ||
    draftTags(draft).join("\n") !== saved.tags.join("\n")
  );
}

/** createPrompt / updatePrompt に渡す FormData（タグはカンマ区切りの 1 本で送る） */
export function draftFormData(draft: PromptDraft, id?: string): FormData {
  const formData = new FormData();
  if (id) formData.set("id", id);
  formData.set("title", draft.title);
  formData.set("body", draft.body);
  formData.set("tags", draftTags(draft).join(","));
  return formData;
}
