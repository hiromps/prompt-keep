"use client";

import { useState, type KeyboardEvent } from "react";
import { X } from "lucide-react";
import { MAX_TAGS, normalizeTags } from "@/schemas/prompt";

/**
 * タグのチップ入力。
 *
 * サーバーへは name="tags" の hidden 1本（カンマ区切り）で送る。
 * 同名 input を複数置くと formDataToObject が
 * 「1個なら文字列 / 複数なら配列」を返し、タグ1個のときだけ型が変わるため。
 *
 * 打ちかけの文字（Enter / カンマ / blur で確定する前）は onPendingChange で親へ知らせる。
 * Esc や外側のクリックで閉じると blur を通らずに閉じることがあり、親が保存時に
 * 打ちかけも含められるようにするため。
 */
export function TagsInput({
  name = "tags",
  value,
  onChange,
  onPendingChange,
  disabled = false,
}: {
  name?: string;
  value: string[];
  onChange: (tags: string[]) => void;
  onPendingChange?: (pending: string) => void;
  /** 保存中など、変更を受け付けないとき */
  disabled?: boolean;
}) {
  const [draft, setDraft] = useState("");

  const updateDraft = (next: string) => {
    setDraft(next);
    onPendingChange?.(next);
  };

  const commit = (raw: string) => {
    const next = normalizeTags([...value, raw].join(","));
    onChange(next);
    updateDraft("");
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
          className="inline-flex items-center gap-0.5 rounded-full bg-[var(--chip)] py-0.5 pr-1 pl-2.5 text-xs text-[var(--foreground)]"
        >
          {tag}
          <button
            type="button"
            onClick={() => onChange(value.filter((t) => t !== tag))}
            disabled={disabled}
            className="inline-flex size-5 items-center justify-center rounded-full text-[var(--muted)] hover:bg-black/10 hover:text-[var(--foreground)] disabled:opacity-40"
            aria-label={`タグ「${tag}」を外す`}
          >
            <X className="size-3" aria-hidden="true" />
          </button>
        </span>
      ))}
      {value.length < MAX_TAGS ? (
        <input
          type="text"
          value={draft}
          onChange={(e) => updateDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => draft.trim() && commit(draft)}
          readOnly={disabled}
          placeholder="タグを追加"
          aria-label="タグを追加"
          className="min-w-24 flex-1 bg-transparent px-1 py-1 text-xs outline-none placeholder:text-[var(--muted)]"
        />
      ) : null}
    </div>
  );
}
