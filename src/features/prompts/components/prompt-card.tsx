"use client";

import { useRef, useState, useTransition, type MouseEvent } from "react";
import {
  Archive,
  ArchiveRestore,
  Check,
  Copy,
  Link2,
  Pencil,
  Share2,
  Star,
  Trash2,
  Undo2,
} from "lucide-react";
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
import { callAction, type ActionError, type ActionResult } from "@/lib/errors";

type PromptAction = (
  prev: ActionResult<{ id: string }> | null,
  formData: FormData,
) => Promise<ActionResult<{ id: string }>>;

/**
 * カード下部のアクション。文字ではなくアイコンで1列に並べる。
 * 狭い画面では2列のカード幅（1枚あたり内側 130px 前後）に5つ収める必要があるので
 * 28px 角にし、sm 以上では 32px 角にする。名前は title / aria-label が担う。
 */
const actionButton =
  "inline-flex size-7 shrink-0 items-center justify-center rounded-full text-[var(--muted)] transition-colors hover:bg-[var(--chip)] hover:text-[var(--foreground)] disabled:opacity-40 sm:size-8";
const actionIcon = "size-4";

/**
 * 右上の印（共有中・ピン留め）の置き場所。先頭行（タイトル、無ければ本文の 1 行目）の
 * 右へ float で回り込ませる。ボタンは 28px 角だが、上下の負のマージンで
 * 1 行の高さ（約 20px）に収め、2 行目以降まで回り込みが続かないようにする。
 */
const indicatorFloat = "relative z-10 float-right -my-1 -mr-1.5 ml-1 flex items-center sm:-mr-2";

export function PromptCard({ prompt, view }: { prompt: Prompt; view: PromptView }) {
  const [editing, setEditing] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [focusField, setFocusField] = useState<"title" | "body">("title");
  // 編集モーダルは「カードのある場所から広がり、閉じるとそこへ戻る」ように見せる
  const cardRef = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
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
      const result = await callAction(() => action(null, formData));
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
    setEditing(true);
  };

  // ゴミ箱の中身は編集させない（復元 / 完全削除のみ）
  const canEdit = view !== "trashed";

  // 右上の印。共有中は常に見せる（「今どれが外に出ているか」はホバーしないと
  // 分からない情報であってはならない）。ピン留めは通常ビューだけ
  const indicators =
    prompt.share_token || view === "active" ? (
      <>
        {prompt.share_token ? (
          <span
            role="img"
            aria-label="共有中"
            title="共有中"
            className="inline-flex size-7 items-center justify-center text-[var(--muted)]"
          >
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
            className={`inline-flex size-7 shrink-0 items-center justify-center rounded-full transition-[opacity,color,background-color] hover:bg-[var(--chip)] disabled:opacity-40 ${
              prompt.is_pinned
                ? "text-[var(--foreground)]"
                : "text-[var(--muted)] opacity-100 hover:text-[var(--foreground)] sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
            }`}
          >
            <Star
              className="size-4"
              fill={prompt.is_pinned ? "currentColor" : "none"}
              aria-hidden="true"
            />
          </button>
        ) : null}
      </>
    ) : null;

  /**
   * カードのどこをクリックしても編集に入る（Keep と同じ）。キーボード操作の導線は
   * 下の「編集」ボタンが担うので、カード自体に role/tabIndex は付けない（タブ停止が二重になる）。
   */
  const handleCardClick = (event: MouseEvent<HTMLElement>) => {
    const target = event.target as Node;
    // ポータルで出しているモーダルの中のクリックも、React のツリーを伝ってここへ届く
    if (!event.currentTarget.contains(target)) return;
    // ボタン（コピー・ピン留めなど）はそれぞれの操作だけをする
    if (target instanceof Element && target.closest("button, a")) return;
    // 文字をドラッグで選んだだけなら開かない（本文の一部を選んでコピーできるように）
    const selection = window.getSelection();
    if (selection && !selection.isCollapsed && event.currentTarget.contains(selection.anchorNode)) {
      return;
    }
    openEdit(titleRef.current?.contains(target) ? "title" : "body");
  };

  return (
    <article
      ref={cardRef}
      onClick={canEdit ? handleCardClick : undefined}
      className={`group relative mb-3 break-inside-avoid rounded-lg border border-[var(--border)] bg-[var(--card)] transition-shadow duration-200 hover:shadow-card-hover focus-within:shadow-card-hover sm:mb-4 ${
        canEdit ? "cursor-pointer" : ""
      } ${
        // 編集中は一覧のカードを消しておく。中央のモーダルへ「持ち上がった」ように見える（Keep と同じ）
        editing ? "opacity-0" : ""
      }`}
    >
      {/* flow-root: 右上の印（float）をこの箱の中に収める */}
      <div className="flow-root px-3 pt-3 sm:px-4">
        {/* 右上の印（共有中・ピン留め）は先頭行の右へ回り込ませる。
            タイトルが無いカードでも、印のためだけの空行ができない */}
        {indicators ? <div className={indicatorFloat}>{indicators}</div> : null}

        {/* タイトルは任意。無いときは見出しを出さず本文だけ見せる（Keep と同じ）。
            本文1行目を見出しに流用すると、直下の本文と重複して読みにくい。 */}
        {prompt.title ? (
          <h3
            ref={titleRef}
            className="text-[15px] leading-snug font-medium break-words text-[var(--foreground)]"
          >
            {prompt.title}
          </h3>
        ) : null}

        {prompt.body ? (
          // 長い本文は 12 行で切り、下端を薄くして続きがあることを示す（globals.css）
          <p
            className={`card-body-clamp whitespace-pre-wrap break-words text-[var(--muted-strong)] ${
              prompt.title ? "mt-1" : ""
            }`}
          >
            {prompt.body}
          </p>
        ) : null}

        {prompt.tags.length > 0 ? (
          <ul className="mt-3 flex flex-wrap gap-1">
            {prompt.tags.map((tag) => (
              <li
                key={tag}
                className="max-w-full truncate rounded-full bg-[var(--chip)] px-2 py-0.5 text-[11px] text-[var(--muted-strong)]"
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
      </div>

      {/* タッチ端末とキーボード操作では常に見せる。hover のみだと到達できない。
          狭い画面では折り返さず、カード幅いっぱいに等間隔で散らす */}
      <div className="mt-1 flex flex-nowrap items-center justify-between px-1.5 pb-1.5 opacity-100 transition-opacity duration-200 sm:justify-start sm:gap-0.5 sm:px-2 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
        {view === "trashed" ? (
          <>
            <button
              type="button"
              disabled={isPending}
              onClick={() => run(restorePrompt, { id: prompt.id })}
              title="復元"
              aria-label="復元"
              className={actionButton}
            >
              <Undo2 className={actionIcon} aria-hidden="true" />
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={() => {
                if (window.confirm("このプロンプトを完全に削除します。元に戻せません。")) {
                  run(purgePrompt, { id: prompt.id });
                }
              }}
              title="完全に削除"
              aria-label="完全に削除"
              className={`${actionButton} hover:text-red-600`}
            >
              <Trash2 className={actionIcon} aria-hidden="true" />
            </button>
          </>
        ) : (
          <>
            <CopyButton
              text={prompt.body}
              className={actionButton}
              label={<Copy className={actionIcon} aria-hidden="true" />}
              copiedLabel={<Check className={`${actionIcon} text-green-600`} aria-hidden="true" />}
            />
            <button
              type="button"
              onClick={() => openEdit("title")}
              disabled={isPending}
              title="編集"
              aria-label="編集"
              className={actionButton}
            >
              <Pencil className={actionIcon} aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => setSharing(true)}
              disabled={isPending}
              title={prompt.share_token ? "共有中" : "共有"}
              aria-label={prompt.share_token ? "共有中" : "共有"}
              className={`${actionButton} ${prompt.share_token ? "text-[var(--foreground)]" : ""}`}
            >
              <Share2 className={actionIcon} aria-hidden="true" />
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
              title={view === "archived" ? "アーカイブ解除" : "アーカイブ"}
              aria-label={view === "archived" ? "アーカイブ解除" : "アーカイブ"}
              className={actionButton}
            >
              {view === "archived" ? (
                <ArchiveRestore className={actionIcon} aria-hidden="true" />
              ) : (
                <Archive className={actionIcon} aria-hidden="true" />
              )}
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={() => run(trashPrompt, { id: prompt.id })}
              title="削除"
              aria-label="削除"
              className={actionButton}
            >
              <Trash2 className={actionIcon} aria-hidden="true" />
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
          anchorRef={cardRef}
          onClose={() => setEditing(false)}
        />
      ) : null}
    </article>
  );
}
