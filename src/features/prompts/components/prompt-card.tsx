"use client";

import { useState, useTransition } from "react";
import {
  updatePrompt,
  setPromptPinned,
  setPromptArchived,
  trashPrompt,
  restorePrompt,
  purgePrompt,
} from "@/features/prompts/actions";
import { CopyButton } from "@/features/prompts/components/copy-button";
import { TagsInput } from "@/features/prompts/components/tags-input";
import { FieldError } from "@/components/form-feedback";
import type { Prompt, PromptView } from "@/features/prompts/model";
import type { ActionError, ActionResult } from "@/lib/errors";

type PromptAction = (
  prev: ActionResult<{ id: string }> | null,
  formData: FormData,
) => Promise<ActionResult<{ id: string }>>;

const actionButton =
  "rounded px-2 py-1 text-xs text-[var(--muted)] hover:bg-[var(--chip)] hover:text-[var(--foreground)] disabled:opacity-40";

export function PromptCard({ prompt, view }: { prompt: Prompt; view: PromptView }) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(prompt.title);
  const [body, setBody] = useState(prompt.body);
  const [tags, setTags] = useState(prompt.tags);
  const [error, setError] = useState<ActionError | null>(null);
  const [focusField, setFocusField] = useState<"title" | "body">("title");
  const [isPending, startTransition] = useTransition();

  /**
   * Server Action を FormData に詰めて直接呼ぶ。
   * <form> を入れ子にせずに済み、ピン/アーカイブは「反転」ではなく
   * 目標状態を明示的に送れる（連打しても結果が変わらない）。
   */
  const run = (action: PromptAction, fields: Record<string, string>, onDone?: () => void) => {
    startTransition(async () => {
      const formData = new FormData();
      for (const [key, value] of Object.entries(fields)) formData.set(key, value);
      const result = await action(null, formData);
      if (result.ok) {
        setError(null);
        onDone?.();
      } else {
        setError(result.error);
      }
    });
  };

  /**
   * 編集を開く。クリックされた場所（タイトル / 本文）へそのままフォーカスを移すので、
   * カードの文字をクリックした流れで書き始められる。
   */
  const openEdit = (field: "title" | "body" = "title") => {
    // 前回の編集内容とエラーを持ち越さない
    setTitle(prompt.title);
    setBody(prompt.body);
    setTags(prompt.tags);
    setError(null);
    setFocusField(field);
    setEditing(true);
  };

  // ゴミ箱の中身は編集させない（復元 / 完全削除のみ）
  const canEdit = view !== "trashed";

  if (editing) {
    return (
      <article className="mb-4 break-inside-avoid rounded-lg border border-[var(--accent)] bg-[var(--card)] p-3 shadow-sm">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="タイトル"
          aria-label="タイトル"
          maxLength={100}
          autoFocus={focusField === "title"}
          className="w-full bg-transparent text-sm font-medium outline-none placeholder:text-[var(--muted)]"
        />
        <FieldError errors={error?.fieldErrors?.title} />
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="プロンプト本文"
          aria-label="プロンプト本文"
          rows={8}
          autoFocus={focusField === "body"}
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
            onClick={() => setEditing(false)}
            disabled={isPending}
            className={actionButton}
          >
            キャンセル
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={() =>
              run(
                updatePrompt,
                { id: prompt.id, title, body, tags: tags.join(",") },
                () => setEditing(false),
              )
            }
            className="rounded bg-[var(--foreground)] px-3 py-1 text-xs font-medium text-[var(--card)] disabled:opacity-40"
          >
            {isPending ? "保存中…" : "保存"}
          </button>
        </div>
      </article>
    );
  }

  return (
    <article className="group mb-4 break-inside-avoid rounded-lg border border-[var(--border)] bg-[var(--card)] p-3 transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-2">
        {/* タイトルは任意。無いときは見出しを出さず本文だけ見せる（Keep と同じ）。
            本文1行目を見出しに流用すると、直下の本文と重複して読みにくい。 */}
        {prompt.title ? (
          // クリックでそのまま編集に入る。キーボード操作の導線は下の「編集」ボタンが担うので、
          // ここに role/tabIndex は付けない（タブ停止が二重になるのを避ける）。
          <h3
            className={`text-sm font-medium break-words ${canEdit ? "cursor-pointer" : ""}`}
            onClick={canEdit ? () => openEdit("title") : undefined}
          >
            {prompt.title}
          </h3>
        ) : (
          <span aria-hidden="true" />
        )}
        {view === "active" ? (
          <button
            type="button"
            disabled={isPending}
            onClick={() =>
              run(setPromptPinned, { id: prompt.id, value: String(!prompt.is_pinned) })
            }
            title={prompt.is_pinned ? "ピン留めを外す" : "ピン留めする"}
            aria-label={prompt.is_pinned ? "ピン留めを外す" : "ピン留めする"}
            className={`shrink-0 rounded px-1.5 text-sm disabled:opacity-40 ${
              prompt.is_pinned
                ? "text-[var(--foreground)]"
                : "text-[var(--muted)] opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
            }`}
          >
            {prompt.is_pinned ? "★" : "☆"}
          </button>
        ) : null}
      </div>

      {prompt.body ? (
        <p
          className={`mt-1.5 line-clamp-[12] text-sm whitespace-pre-wrap break-words text-[var(--muted-strong)] ${
            canEdit ? "cursor-pointer" : ""
          }`}
          onClick={canEdit ? () => openEdit("body") : undefined}
        >
          {prompt.body}
        </p>
      ) : null}

      {prompt.tags.length > 0 ? (
        <ul className="mt-2 flex flex-wrap gap-1">
          {prompt.tags.map((tag) => (
            <li
              key={tag}
              className="rounded-full bg-[var(--chip)] px-2 py-0.5 text-[11px] text-[var(--muted-strong)]"
            >
              {tag}
            </li>
          ))}
        </ul>
      ) : null}

      {error ? (
        <p role="alert" className="mt-2 text-sm text-red-600">
          {error.message}
        </p>
      ) : null}

      {/* タッチ端末とキーボード操作では常に見せる。hover のみだと到達できない */}
      <div className="mt-2 flex flex-wrap justify-end gap-0.5 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
        {view === "trashed" ? (
          <>
            <button
              type="button"
              disabled={isPending}
              onClick={() => run(restorePrompt, { id: prompt.id })}
              className={actionButton}
            >
              復元
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={() => {
                if (window.confirm("このプロンプトを完全に削除します。元に戻せません。")) {
                  run(purgePrompt, { id: prompt.id });
                }
              }}
              className={`${actionButton} hover:text-red-600`}
            >
              完全に削除
            </button>
          </>
        ) : (
          <>
            <CopyButton text={prompt.body} className={actionButton} />
            <button
              type="button"
              onClick={() => openEdit("title")}
              disabled={isPending}
              className={actionButton}
            >
              編集
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={() =>
                run(setPromptArchived, {
                  id: prompt.id,
                  value: String(view !== "archived"),
                })
              }
              className={actionButton}
            >
              {view === "archived" ? "アーカイブ解除" : "アーカイブ"}
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={() => run(trashPrompt, { id: prompt.id })}
              className={actionButton}
            >
              削除
            </button>
          </>
        )}
      </div>
    </article>
  );
}
