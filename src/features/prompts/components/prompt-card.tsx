"use client";

import { useRef, useState, useTransition } from "react";
import { Link2 } from "lucide-react";
import {
  setPromptPinned,
  setPromptArchived,
  trashPrompt,
  restorePrompt,
  purgePrompt,
} from "@/features/prompts/actions";
import { CopyButton } from "@/features/prompts/components/copy-button";
import { PromptEditorDialog } from "@/features/prompts/components/prompt-editor-dialog";
import { PromptShareDialog } from "@/features/prompts/components/prompt-share-dialog";
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
  const [sharing, setSharing] = useState(false);
  const [focusField, setFocusField] = useState<"title" | "body">("title");
  // 編集モーダルを「カードのある場所から広がる」ように見せるための開始位置
  const [cardRect, setCardRect] = useState<DOMRect | null>(null);
  const cardRef = useRef<HTMLElement>(null);
  const [error, setError] = useState<ActionError | null>(null);
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
    setError(null); // 前回のエラーを持ち越さない
    setFocusField(field);
    setCardRect(cardRef.current?.getBoundingClientRect() ?? null);
    setEditing(true);
  };

  // ゴミ箱の中身は編集させない（復元 / 完全削除のみ）
  const canEdit = view !== "trashed";

  return (
    <article ref={cardRef} className="group mb-4 break-inside-avoid rounded-lg border border-[var(--border)] bg-[var(--card)] p-3 transition-shadow hover:shadow-md">
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
        <div className="flex shrink-0 items-center gap-1">
          {/* 共有中は常に見せる。「今どれが外に出ているか」はホバーしないと
              分からない情報であってはならない */}
          {prompt.share_token ? (
            <span role="img" aria-label="共有中" title="共有中" className="text-[var(--muted)]">
              <Link2 className="size-3.5" strokeWidth={2} aria-hidden="true" />
            </span>
          ) : null}
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
              onClick={() => setSharing(true)}
              disabled={isPending}
              className={actionButton}
            >
              {prompt.share_token ? "共有中" : "共有"}
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

      {sharing ? (
        <PromptShareDialog prompt={prompt} onClose={() => setSharing(false)} />
      ) : null}

      {editing ? (
        <PromptEditorDialog
          prompt={prompt}
          focusField={focusField}
          cardRect={cardRect}
          onClose={() => setEditing(false)}
        />
      ) : null}
    </article>
  );
}
