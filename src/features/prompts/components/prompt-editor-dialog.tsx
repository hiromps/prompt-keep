"use client";

import { useEffect, useEffectEvent, useRef, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft } from "lucide-react";
import { updatePrompt } from "@/features/prompts/actions";
import { TagsInput } from "@/features/prompts/components/tags-input";
import { FieldError } from "@/components/form-feedback";
import { useBackdropClick } from "@/components/outside-click";
import { useUnloadWarning } from "@/components/unload-warning";
import {
  draftFormData,
  isDraftChanged,
  type Prompt,
  type PromptDraft,
} from "@/features/prompts/model";
import { callAction, type ActionError } from "@/lib/errors";

const DURATION = 200;
/** 本文欄の最低の高さ。短いプロンプトでもフォームとして成立する大きさ */
const MIN_BODY_HEIGHT = 160;
/** 本文が長いときに横幅を広げる目安。これを超えたら 1 行あたりの文字数を増やす */
const WIDE_BODY_LENGTH = 400;
const WIDE_BODY_LINES = 12;
/** その場で薄くして閉じるときの長さ。フェードを見せるぶん少し長く取る（globals.css と揃える） */
const FADE_CLOSE_DURATION = 260;

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** サイドバーがドロワーになる幅。Tailwind の md 未満と同じ境目にする */
function isNarrow() {
  return window.matchMedia("(max-width: 767px)").matches;
}

/**
 * カードの位置・大きさと、画面中央に開いたモーダルの位置・大きさの差から
 * transform を作る。これを起点にすると、カードがそのまま中央へせり上がって見える。
 */
function transformFromCard(dialog: HTMLDialogElement, card: DOMRect): string | null {
  const to = dialog.getBoundingClientRect();
  if (!to.width || !to.height || !card.width || !card.height) return null;
  const dx = card.left + card.width / 2 - (to.left + to.width / 2);
  const dy = card.top + card.height / 2 - (to.top + to.height / 2);
  return `translate(${dx}px, ${dy}px) scale(${card.width / to.width}, ${card.height / to.height})`;
}

/** カードが画面内に見えているか（見えていないカードへ縮めると、画面外へ飛んでいくだけになる） */
function isInViewport(rect: DOMRect): boolean {
  return rect.bottom > 0 && rect.top < window.innerHeight && rect.width > 0;
}

const updatedAtFormat = new Intl.DateTimeFormat("ja-JP", {
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});
const updatedAtWithYearFormat = new Intl.DateTimeFormat("ja-JP", {
  year: "numeric",
  month: "short",
  day: "numeric",
});

function formatUpdatedAt(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.getFullYear() === new Date().getFullYear()
    ? updatedAtFormat.format(date)
    : updatedAtWithYearFormat.format(date);
}

/**
 * - editing: 入力を受け付けている
 * - saving: 閉じる前の保存中（入力は止める。重ねて閉じる操作をしても無視する）
 * - closing: 閉じるアニメーション中。ここまで来たら保存は済んでいるか、破棄が選ばれている
 */
type Stage = "editing" | "saving" | "closing";

/**
 * カードの編集モーダル。
 *
 * 一覧の中でカードを編集フォームに差し替えると、カードの高さが変わって
 * マソンリー全体が組み替わってしまう。編集は <dialog> に切り出し、
 * 背景を暗くして中央に出す（Google Keep と同じ）。
 *
 * ネイティブの <dialog>.showModal() を使うのは、フォーカストラップ・Esc・
 * 背景の inert を自前で実装せずに済むため。
 *
 * 閉じる操作（背景のクリック・Esc・戻る・閉じる / 保存ボタン・Ctrl+Enter）は、
 * 変更があれば「保存 → 保存の完了 → 閉じる」の順に進める（Keep と同じく、閉じれば保存される）。
 * 保存に失敗したら開いたままエラーを出す。変更を捨てて閉じるのは「キャンセル」だけ。
 *
 * body 直下へポータルで出す。カードの中に置くと、他の端末の更新で一覧の並びが変わったとき
 * React がカードの DOM を動かし、そのとき <dialog> がいったん文書から外れて
 * モーダル（top layer）でなくなってしまう。
 */
export function PromptEditorDialog({
  prompt,
  focusField,
  anchorRef,
  onClose,
}: {
  prompt: Prompt;
  focusField: "title" | "body";
  /** 開いたカード。ここから中央へ広がり、変更が無ければここへ戻って閉じる */
  anchorRef: RefObject<HTMLElement | null>;
  /** 閉じきったときに呼ばれる（親はここでアンマウントする） */
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  // 開いた時点の保存済みの内容。変更の有無はこれと比べる。開いている間に他の端末の更新で
  // prompt が新しくなっても、ここで何も変えていなければ閉じるときに上書き保存しない
  const [saved] = useState(() => ({ title: prompt.title, body: prompt.body, tags: prompt.tags }));
  const [draft, setDraft] = useState<PromptDraft>(() => ({ ...saved, pendingTag: "" }));
  // 保存・閉じる処理は必ずこちらを読む。入力のたびに同期で書き換えるので、
  // 非同期処理の続きやアンマウント時でも最後に打った文字まで入っている
  const latest = useRef(draft);
  const stage = useRef<Stage>("editing");
  // IME の変換中か。変換中の Esc は「変換の取り消し」なのでモーダルを閉じない
  const composing = useRef(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<ActionError | null>(null);

  const update = (patch: Partial<PromptDraft>) => {
    const next = { ...latest.current, ...patch };
    latest.current = next;
    setDraft(next);
  };

  const dirty = isDraftChanged(draft, saved);
  // 未保存のままタブを閉じる・再読み込みするときはブラウザに確認させる
  useUnloadWarning(dirty);

  // 長い本文は 1 行が短いと読みづらいので、開くときの横幅も広げる。
  // 開いた後の入力では変えない（幅が変わると行の折り返しごと動いて読みにくい）
  const wide =
    saved.body.length > WIDE_BODY_LENGTH || saved.body.split("\n").length > WIDE_BODY_LINES;

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

    const card = anchorRef.current?.getBoundingClientRect();
    if (!card || prefersReducedMotion()) return;
    const from = transformFromCard(dialog, card);
    if (!from) return;
    dialog.animate(
      [
        { transform: from, opacity: 0.4 },
        { transform: "translate(0, 0) scale(1, 1)", opacity: 1 },
      ],
      { duration: DURATION, easing: "cubic-bezier(0.2, 0, 0, 1)" },
    );
    // 開いたときに一度だけ実行する
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * 閉じるアニメーションを流す。
   *
   * 変更が無いときは開いたカードの場所へ縮めて戻す（Keep と同じ）。カードの位置は
   * 閉じる時点で測り直す（開いている間に背後がスクロールしていることがある）。
   * 保存したときはその場で薄くする。保存すると更新日時順でカードの位置が変わるので、
   * 元の場所へ戻すと「そこに戻った」ように見えてしまう。
   *
   * 狭い画面も常にその場で薄くする。画面幅いっぱいのモーダルが一覧の小さなカードまで
   * 一気に縮むと、動きが速すぎて「消えた」ではなく「パッと切れた」に見える。
   */
  const playCloseAnimation = async (dialog: HTMLDialogElement, returnToCard: boolean) => {
    if (prefersReducedMotion()) return;
    const card = returnToCard && !isNarrow() ? anchorRef.current?.getBoundingClientRect() : null;
    const to = card && isInViewport(card) ? transformFromCard(dialog, card) : null;
    // 背景の暗転も同時に戻す（CSS 側で dialog.is-closing::backdrop を逆再生する。
    // フェードのときは is-fading で長さと立ち上がりをモーダルに揃える）
    dialog.classList.add("is-closing");
    if (!to) dialog.classList.add("is-fading");
    await dialog
      .animate(
        to
          ? [
              { transform: "translate(0, 0) scale(1, 1)", opacity: 1 },
              { transform: to, opacity: 0.6 },
            ]
          : [
              { transform: "scale(1)", opacity: 1 },
              { transform: "scale(0.96)", opacity: 0 },
            ],
        to
          ? { duration: DURATION, easing: "cubic-bezier(0.4, 0, 1, 1)" }
          : // 立ち上がりを速くして、薄くなっていく過程を見せる
            { duration: FADE_CLOSE_DURATION, easing: "ease-out" },
      )
      .finished.catch(() => {});
  };

  /**
   * 閉じる操作の入口。save は「変更があれば保存してから閉じる」、discard は変更を捨てて閉じる。
   *
   * 保存は閉じる前に必ず終わらせる。保存中は入力を止めるので、保存した内容と
   * 画面の内容がずれない（押した後に打った文字が保存されないまま閉じる、が起きない）。
   */
  const finish = async (intent: "save" | "discard") => {
    // 保存中・閉じている途中に重ねて閉じる操作をしても、二重に保存・クローズしない
    if (stage.current !== "editing") return;
    const dialog = dialogRef.current;
    if (!dialog) return;

    const current = latest.current;
    const willSave = intent === "save" && isDraftChanged(current, saved);
    if (willSave) {
      stage.current = "saving";
      setSaving(true);
      setError(null);
      const result = await callAction(() => updatePrompt(null, draftFormData(current, prompt.id)));
      if (!result.ok) {
        stage.current = "editing";
        setSaving(false);
        setError(result.error);
        // 保存中にブラウザ側で閉じられていた（Esc の連打など）ら、開き直してエラーを見せる
        if (!dialog.open) {
          dialog.showModal();
          bodyRef.current?.focus();
        }
        return;
      }
    }

    stage.current = "closing";
    if (!dialog.open) {
      // ブラウザ側で既に閉じている（close イベントは済んでいる）
      onClose();
      return;
    }
    await playCloseAnimation(dialog, !willSave);
    dialog.close(); // → close イベント → handleClose → onClose
  };

  // close イベント。こちらの手順で閉じたときは親へ伝えるだけ。ブラウザが自分で閉じたとき
  // （キャンセルできない 2 回目の Esc など）は、保存してから閉じる流れに乗せる
  const handleClose = () => {
    if (stage.current === "closing") onClose();
    else void finish("save");
  };

  // 閉じる操作を通らずに消えたとき（ブラウザの戻るでビューが切り替わった、他の端末の操作で
  // カードが一覧から外れた等）。未保存の変更があれば裏で保存しておく
  const saveOnUnmount = useEffectEvent(() => {
    const current = latest.current;
    if (stage.current !== "editing" || !isDraftChanged(current, saved)) return;
    void callAction(() => updatePrompt(null, draftFormData(current, prompt.id)));
  });
  useEffect(() => () => saveOnUnmount(), []);

  const backdrop = useBackdropClick(() => void finish("save"));

  return createPortal(
    <dialog
      ref={dialogRef}
      onClose={handleClose}
      onCancel={(e) => {
        // Esc。既定の即時クローズを止めて、保存してから閉じる流れに乗せる
        e.preventDefault();
        if (composing.current) return;
        void finish("save");
      }}
      onKeyDown={(e) => {
        // Ctrl+Enter（Mac は ⌘+Enter）で保存して閉じる
        if (e.key === "Enter" && (e.ctrlKey || e.metaKey) && !e.nativeEvent.isComposing) {
          e.preventDefault();
          void finish("save");
        }
      }}
      onCompositionStart={() => {
        composing.current = true;
      }}
      onCompositionEnd={() => {
        composing.current = false;
      }}
      {...backdrop}
      aria-label="プロンプトを編集"
      className={`m-auto bg-[var(--card)] p-0 text-[var(--foreground)] shadow-2xl backdrop:bg-black/50 max-md:h-[100dvh] max-md:max-h-none max-md:w-full max-md:max-w-none md:rounded-lg md:border md:border-[var(--border)] ${
        wide ? "md:w-[min(92vw,56rem)]" : "md:w-[min(92vw,42rem)]"
      }`}
    >
      <div
        ref={panelRef}
        aria-busy={saving}
        className="flex flex-col px-4 pt-3 pb-3 max-md:h-full max-md:pb-[max(0.75rem,env(safe-area-inset-bottom))] max-md:pt-[max(0.75rem,env(safe-area-inset-top))] md:h-[var(--panel-height)] md:max-h-[85vh] md:px-5 md:pt-4"
      >
        {/*
          全画面で開く狭い画面には、背景をタップして閉じる余白が無い。
          戻るボタンを左上に出す（変更があれば保存してから閉じる）。
          広い画面では背景クリックと Esc があるので出さない。
        */}
        <button
          type="button"
          onClick={() => void finish("save")}
          disabled={saving}
          aria-label="閉じる"
          className="-ml-2 mb-1 inline-flex size-11 shrink-0 items-center justify-center self-start rounded-full text-[var(--muted)] hover:bg-[var(--chip)] hover:text-[var(--foreground)] disabled:opacity-40 md:hidden"
        >
          <ArrowLeft className="size-5" aria-hidden="true" />
        </button>
        <input
          ref={titleRef}
          value={draft.title}
          onChange={(e) => update({ title: e.target.value })}
          readOnly={saving}
          placeholder="タイトル"
          aria-label="タイトル"
          maxLength={100}
          // 狭い画面では globals.css が入力欄を一律 16px にする（iOS の自動拡大対策）。
          // タイトルだけは本文より大きく見せたいので、そこに勝つよう ! を付ける（16px 以上なので拡大は起きない）
          className="w-full bg-transparent text-lg! leading-snug font-medium outline-none placeholder:text-[var(--muted)]"
        />
        <FieldError errors={error?.fieldErrors?.title} />
        <textarea
          ref={bodyRef}
          value={draft.body}
          onChange={(e) => update({ body: e.target.value })}
          readOnly={saving}
          placeholder="プロンプト本文"
          aria-label="プロンプト本文"
          className="mt-3 min-h-0 flex-1 resize-none overflow-y-auto bg-transparent text-[15px] leading-relaxed outline-none placeholder:text-[var(--muted)]"
        />
        <FieldError errors={error?.fieldErrors?.body} />
        <div className="mt-3">
          <TagsInput
            value={draft.tags}
            onChange={(tags) => update({ tags })}
            onPendingChange={(pendingTag) => update({ pendingTag })}
            disabled={saving}
          />
        </div>
        {error && error.code !== "VALIDATION" ? (
          <p role="alert" className="mt-2 text-sm text-red-600">
            {error.message}
          </p>
        ) : null}
        <div className="mt-3 flex items-center gap-2 border-t border-[var(--border)] pt-3">
          {/* 保存の状態。閉じれば保存されるので、未保存かどうかだけを控えめに伝える */}
          <p aria-live="polite" className="min-w-0 flex-1 truncate text-xs text-[var(--muted)]">
            {saving ? (
              "保存中…"
            ) : dirty ? (
              <span className="inline-flex items-center gap-1.5">
                <span aria-hidden="true" className="size-1.5 rounded-full bg-[var(--accent)]" />
                未保存の変更があります
              </span>
            ) : (
              `最終更新 ${formatUpdatedAt(prompt.updated_at)}`
            )}
          </p>
          {dirty ? (
            <button
              type="button"
              onClick={() => void finish("discard")}
              disabled={saving}
              title="変更を保存せずに閉じる"
              className="shrink-0 rounded-md px-3 py-1.5 text-sm text-[var(--muted)] hover:bg-[var(--chip)] hover:text-[var(--foreground)] disabled:opacity-40"
            >
              キャンセル
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => void finish("save")}
            disabled={saving}
            title={dirty ? "保存して閉じる（Ctrl+Enter）" : "閉じる（Esc）"}
            aria-keyshortcuts="Control+Enter Meta+Enter"
            className={`shrink-0 rounded-md px-4 py-1.5 text-sm font-medium transition-colors disabled:opacity-40 ${
              dirty || saving
                ? "bg-[var(--foreground)] text-[var(--card)] hover:bg-[var(--muted-strong)]"
                : "text-[var(--foreground)] hover:bg-[var(--chip)]"
            }`}
          >
            {dirty || saving ? "保存" : "閉じる"}
          </button>
        </div>
      </div>
    </dialog>,
    document.body,
  );
}
