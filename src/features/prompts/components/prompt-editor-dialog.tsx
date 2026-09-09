"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { updatePrompt } from "@/features/prompts/actions";
import { TagsInput } from "@/features/prompts/components/tags-input";
import { FieldError } from "@/components/form-feedback";
import type { Prompt } from "@/features/prompts/model";
import type { ActionError } from "@/lib/errors";

const DURATION = 200;
/** 本文欄の最低の高さ。短いプロンプトでもフォームとして成立する大きさ */
const MIN_BODY_HEIGHT = 160;
/** 本文が長いときに横幅を広げる目安。これを超えたら 1 行あたりの文字数を増やす */
const WIDE_BODY_LENGTH = 400;
const WIDE_BODY_LINES = 12;
/** 狭い画面の閉じアニメーション。フェードを見せるぶん少し長く取る（globals.css と揃える） */
const NARROW_CLOSE_DURATION = 260;

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** サイドバーがドロワーになる幅。Tailwind の md 未満と同じ境目にする */
function isNarrow() {
  return window.matchMedia("(max-width: 767px)").matches;
}

/**
 * 開いたカードの位置・大きさと、画面中央に開いたモーダルの位置・大きさの差から
 * transform を作る。これを起点にすると、カードがそのまま中央へせり上がって見える。
 */
function transformFromCard(dialog: HTMLDialogElement, card: DOMRect): string | null {
  const to = dialog.getBoundingClientRect();
  if (!to.width || !to.height) return null;
  const dx = card.left + card.width / 2 - (to.left + to.width / 2);
  const dy = card.top + card.height / 2 - (to.top + to.height / 2);
  return `translate(${dx}px, ${dy}px) scale(${card.width / to.width}, ${card.height / to.height})`;
}

/**
 * カードの編集モーダル。
 *
 * 一覧の中でカードを編集フォームに差し替えると、カードの高さが変わって
 * マソンリー全体が組み替わってしまう。編集は <dialog> に切り出し、
 * 背景を暗くして中央に出す（Google Keep と同じ）。
 *
 * ネイティブの <dialog>.showModal() を使うのは、フォーカストラップ・Esc・
 * 背景の inert を自前で実装せずに済むため。
 */
export function PromptEditorDialog({
  prompt,
  focusField,
  cardRect,
  onClose,
}: {
  prompt: Prompt;
  focusField: "title" | "body";
  /** 開く前のカードの位置。ここから中央へ広がるアニメーションの起点にする */
  cardRect: DOMRect | null;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const closing = useRef(false);
  const [title, setTitle] = useState(prompt.title);
  const [body, setBody] = useState(prompt.body);
  const [tags, setTags] = useState(prompt.tags);
  const [error, setError] = useState<ActionError | null>(null);
  const [isPending, startTransition] = useTransition();

  // 長い本文は 1 行が短いと読みづらいので、開くときの横幅も広げる。
  // 開いた後の入力では変えない（幅が変わると行の折り返しごと動いて読みにくい）
  const wide =
    prompt.body.length > WIDE_BODY_LENGTH ||
    prompt.body.split("\n").length > WIDE_BODY_LINES;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    dialog.showModal();

    // 本文の量に合わせて開いたときの高さを決める。showModal() の前は
    // display:none で scrollHeight が 0 になるので、必ずこの順で測る。
    // 高さは本文欄ではなく箱（panel）に入れる。本文欄を min-height で伸ばすと
    // タグが折り返したときに箱からはみ出すが、箱の高さを決めておけば
    // はみ出したぶんは flex が本文欄から削ってくれる。
    // 上限は CSS 側の 85vh。ここは開いた直後の一度きりで、入力には追従させない。
    const bodyEl = bodyRef.current;
    const panel = panelRef.current;
    if (bodyEl && panel) {
      const fit = Math.max(bodyEl.scrollHeight, MIN_BODY_HEIGHT);
      const chrome = panel.getBoundingClientRect().height - bodyEl.getBoundingClientRect().height;
      panel.style.setProperty("--panel-height", `${Math.round(chrome + fit)}px`);
    }

    // showModal() は React の autoFocus を上書きして先頭の入力欄へフォーカスを移す。
    // クリックされた欄へ当て直し、本文はキャレットを末尾に置く（追記しやすいように）。
    if (focusField === "body" && bodyRef.current) {
      const el = bodyRef.current;
      el.focus();
      el.setSelectionRange(el.value.length, el.value.length);
    } else {
      titleRef.current?.focus();
    }

    if (!cardRect || prefersReducedMotion()) return;
    const from = transformFromCard(dialog, cardRect);
    if (!from) return;
    dialog.animate(
      [
        { transform: from, opacity: 0.4 },
        { transform: "translate(0, 0) scale(1, 1)", opacity: 1 },
      ],
      { duration: DURATION, easing: "cubic-bezier(0.2, 0, 0, 1)" },
    );
    // 一度だけ実行する（cardRect は開いた時点の値で固定）
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * 閉じるアニメーションを流してから dialog を閉じる。
   *
   * 狭い画面ではカードへ吸い込ませない。画面幅いっぱいのモーダルが一覧の小さな
   * カードまで一気に縮むと、動きが速すぎて「消えた」ではなく「パッと切れた」に見える
   * （カードが画面外にあれば、そちらへ飛んでいくだけになる）。その場で薄くしながら
   * わずかに縮めるほうが、閉じたことがはっきり伝わる。
   * 広い画面はカードとの距離が近いので、開いた場所へ戻す動きのままにする。
   */
  const requestClose = () => {
    const dialog = dialogRef.current;
    if (!dialog || closing.current) return;
    closing.current = true;

    const narrow = isNarrow();
    const animated = !prefersReducedMotion();
    const to = animated && !narrow && cardRect ? transformFromCard(dialog, cardRect) : null;
    // 広い画面でカードの位置が取れないときは、戻す先が無いのでそのまま閉じる
    if (!animated || (!narrow && !to)) {
      dialog.close();
      return;
    }
    // 背景の暗転も同時に戻す（CSS 側で dialog.is-closing::backdrop を逆再生する）
    dialog.classList.add("is-closing");
    dialog
      .animate(
        to
          ? [
              { transform: "translate(0, 0) scale(1, 1)", opacity: 1 },
              { transform: to, opacity: 0 },
            ]
          : [
              { transform: "scale(1)", opacity: 1 },
              { transform: "scale(0.94)", opacity: 0 },
            ],
        to
          ? { duration: DURATION, easing: "cubic-bezier(0.4, 0, 1, 1)" }
          : // 立ち上がりを速くして、薄くなっていく過程を見せる
            { duration: NARROW_CLOSE_DURATION, easing: "ease-out" },
      )
      .finished.catch(() => {})
      .finally(() => dialog.close());
  };

  const save = () => {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("id", prompt.id);
      formData.set("title", title);
      formData.set("body", body);
      formData.set("tags", tags.join(","));
      const result = await updatePrompt(null, formData);
      if (result.ok) requestClose();
      else setError(result.error);
    });
  };

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      onCancel={(e) => {
        // Esc。既定の即時クローズを止めて、閉じるアニメーションに乗せる
        e.preventDefault();
        requestClose();
      }}
      onClick={(e) => {
        // 背景（dialog 自身）のクリックだけを拾う。中身のクリックは無視する
        if (e.target === dialogRef.current) requestClose();
      }}
      aria-label="プロンプトを編集"
      className={`m-auto bg-[var(--card)] p-0 text-[var(--foreground)] shadow-2xl backdrop:bg-black/50 max-md:h-[100dvh] max-md:max-h-none max-md:w-full max-md:max-w-none md:rounded-xl md:border md:border-[var(--border)] ${
        wide ? "md:w-[min(92vw,56rem)]" : "md:w-[min(92vw,42rem)]"
      }`}
    >
      <div
        ref={panelRef}
        className="flex flex-col p-4 max-md:h-full max-md:pb-[max(1rem,env(safe-area-inset-bottom))] max-md:pt-[max(1rem,env(safe-area-inset-top))] md:h-[var(--panel-height)] md:max-h-[85vh]"
      >
        <input
          ref={titleRef}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="タイトル"
          aria-label="タイトル"
          maxLength={100}
          className="w-full bg-transparent font-medium outline-none placeholder:text-[var(--muted)]"
        />
        <FieldError errors={error?.fieldErrors?.title} />
        <textarea
          ref={bodyRef}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="プロンプト本文"
          aria-label="プロンプト本文"
          className="mt-3 min-h-0 flex-1 resize-none overflow-y-auto bg-transparent text-sm outline-none placeholder:text-[var(--muted)]"
        />
        <FieldError errors={error?.fieldErrors?.body} />
        <div className="mt-3">
          <TagsInput value={tags} onChange={setTags} />
        </div>
        {error && error.code !== "VALIDATION" ? (
          <p role="alert" className="mt-2 text-sm text-red-600">
            {error.message}
          </p>
        ) : null}
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={requestClose}
            disabled={isPending}
            className="rounded px-3 py-1.5 text-sm text-[var(--muted)] hover:bg-[var(--chip)] disabled:opacity-40"
          >
            キャンセル
          </button>
          <button
            type="button"
            onClick={save}
            disabled={isPending}
            className="rounded bg-[var(--foreground)] px-4 py-1.5 text-sm font-medium text-[var(--card)] disabled:opacity-40"
          >
            {isPending ? "保存中…" : "保存"}
          </button>
        </div>
      </div>
    </dialog>
  );
}
