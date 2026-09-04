"use client";

import { useState, type KeyboardEvent } from "react";
import { MAX_TAGS, normalizeTags } from "@/schemas/prompt";

/**
 * タグのチップ入力。
 *
 * サーバーへは name="tags" の hidden 1本（カンマ区切り）で送る。
 * 同名 input を複数置くと formDataToObject が
 * 「1個なら文字列 / 複数なら配列」を返し、タグ1個のときだけ型が変わるため。
 */
export function TagsInput({
  name = "tags",
  value,
  onChange,
}: {
  name?: string;
  value: string[];
  onChange: (tags: string[]) => void;
}) {
  const [draft, setDraft] = useState("");

  const commit = (raw: string) => {
    const next = normalizeTags([...value, raw].join(","));
    onChange(next);
    setDraft("");
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    // IME 変換中の Enter はタグ確定ではなく変換確定なので無視する
    if (event.nativeEvent.isComposing) return;

    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      if (draft.trim()) commit(draft);
      return;
    }
    if (event.key === "Backspace" && !draft && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <input type="hidden" name={name} value={value.join(",")} />
      {value.map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center gap-1 rounded-full bg-[var(--chip)] px-2.5 py-1 text-xs text-[var(--foreground)]"
        >
          {tag}
          <button
            type="button"
            onClick={() => onChange(value.filter((t) => t !== tag))}
            className="text-[var(--muted)] hover:text-[var(--foreground)]"
            aria-label={`タグ「${tag}」を外す`}
          >
            ×
          </button>
        </span>
      ))}
      {value.length < MAX_TAGS ? (
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => draft.trim() && commit(draft)}
          placeholder="タグを追加"
          aria-label="タグを追加"
          className="min-w-24 flex-1 bg-transparent px-1 py-1 text-xs outline-none placeholder:text-[var(--muted)]"
        />
      ) : null}
    </div>
  );
}
