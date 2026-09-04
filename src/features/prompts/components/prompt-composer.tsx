"use client";

import { useState, useTransition } from "react";
import { createPrompt } from "@/features/prompts/actions";
import { TagsInput } from "@/features/prompts/components/tags-input";
import { FieldError } from "@/components/form-feedback";
import type { ActionError } from "@/lib/errors";

/**
 * Keep 風のクイック入力。畳んだ1行がフォーカスで展開する。
 *
 * 入力値は React の state で持つ（非制御にしない）。
 * React 19 は form action の完了時に非制御フィールドを自動リセットするため、
 * バリデーション失敗のたびに書きかけの本文が消えてしまう。
 */
export function PromptComposer() {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [error, setError] = useState<ActionError | null>(null);
  const [isPending, startTransition] = useTransition();

  const close = () => {
    setOpen(false);
    setTitle("");
    setBody("");
    setTags([]);
    setError(null);
  };

  const submit = () => {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("title", title);
      formData.set("body", body);
      formData.set("tags", tags.join(","));
      const result = await createPrompt(null, formData);
      if (result.ok) close();
      else setError(result.error);
    });
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-left text-sm text-[var(--muted)] shadow-sm hover:shadow-md"
      >
        プロンプトを追加…
      </button>
    );
  }

  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-3 shadow-md">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="タイトル（任意）"
        aria-label="タイトル"
        maxLength={100}
        autoFocus
        className="w-full bg-transparent text-sm font-medium outline-none placeholder:text-[var(--muted)]"
      />
      <FieldError errors={error?.fieldErrors?.title} />
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="プロンプト本文"
        aria-label="プロンプト本文"
        rows={5}
        className="mt-2 w-full resize-y bg-transparent text-sm outline-none placeholder:text-[var(--muted)]"
      />
      <FieldError errors={error?.fieldErrors?.body} />
      <div className="mt-2">
        <TagsInput value={tags} onChange={setTags} />
      </div>
      {error && error.code !== "VALIDATION" ? (
        <p role="alert" className="mt-2 text-sm text-red-600">
          {error.message}
        </p>
      ) : null}
      <div className="mt-3 flex justify-end gap-2">
        <button
          type="button"
          onClick={close}
          disabled={isPending}
          className="rounded px-3 py-1 text-xs text-[var(--muted)] hover:bg-[var(--chip)] disabled:opacity-40"
        >
          閉じる
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={isPending}
          className="rounded bg-[var(--foreground)] px-3 py-1 text-xs font-medium text-[var(--card)] disabled:opacity-40"
        >
          {isPending ? "保存中…" : "保存"}
        </button>
      </div>
    </div>
  );
}
