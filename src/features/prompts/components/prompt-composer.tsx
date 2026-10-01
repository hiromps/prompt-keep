"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import { createPrompt } from "@/features/prompts/actions";
import { TagsInput } from "@/features/prompts/components/tags-input";
import { FieldError } from "@/components/form-feedback";
import { useClickOutside } from "@/components/outside-click";
import { useUnloadWarning } from "@/components/unload-warning";
import {
  EMPTY_DRAFT,
  draftFormData,
  isBlankDraft,
  type PromptDraft,
} from "@/features/prompts/model";
import { callAction, type ActionError } from "@/lib/errors";

/**
 * Keep 風のクイック入力。畳んだ1行がクリックで展開する。
 *
 * 閉じる操作（外側のクリック・Esc・保存 / 閉じるボタン・Ctrl+Enter）は、入力があれば
 * 保存してから畳む（Keep と同じく、書いて外を触れば保存される）。入力を捨てるのは
 * 「キャンセル」だけ。保存に失敗したら開いたままエラーを出す。
 * 外側の判定は「押した場所と離した場所の両方が外」のとき（outside-click.ts）。
 * 本文を選択しながら外へ出て離しても畳まない。
 *
 * 入力値は React の state で持つ（非制御にしない）。
 * React 19 は form action の完了時に非制御フィールドを自動リセットするため、
 * バリデーション失敗のたびに書きかけの本文が消えてしまう。
 */
export function PromptComposer() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<PromptDraft>(EMPTY_DRAFT);
  // 保存は必ずこちらを読む。入力のたびに同期で書き換えるので、最後に打った文字まで入っている
  const latest = useRef(draft);
  // 保存中か。重ねて閉じる操作をしても二重に作成しない
  const busy = useRef(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<ActionError | null>(null);

  const update = (patch: Partial<PromptDraft>) => {
    const next = { ...latest.current, ...patch };
    latest.current = next;
    setDraft(next);
  };

  const filled = !isBlankDraft(draft);
  // 書きかけのままタブを閉じる・再読み込みするときはブラウザに確認させる
  useUnloadWarning(open && filled);

  const collapse = () => {
    latest.current = EMPTY_DRAFT;
    setDraft(EMPTY_DRAFT);
    setError(null);
    setOpen(false);
  };

  /** save は「入力があれば保存してから畳む」、discard は入力を捨てて畳む */
  const finish = async (intent: "save" | "discard") => {
    if (busy.current) return;
    const current = latest.current;
    if (intent === "discard" || isBlankDraft(current)) {
      collapse();
      return;
    }
    busy.current = true;
    setSaving(true);
    setError(null);
    const result = await callAction(() => createPrompt(null, draftFormData(current)));
    busy.current = false;
    setSaving(false);
    if (result.ok) collapse();
    else setError(result.error);
  };

  useClickOutside(containerRef, () => void finish("save"), open);

  // 閉じる操作を通らずに消えたとき（ブラウザの戻るでアーカイブへ移った等）も書きかけを残す
  const saveOnUnmount = useEffectEvent(() => {
    const current = latest.current;
    if (!open || busy.current || isBlankDraft(current)) return;
    void callAction(() => createPrompt(null, draftFormData(current)));
  });
  useEffect(() => () => saveOnUnmount(), []);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-left text-[15px] font-medium text-[var(--muted)] shadow-raised transition-shadow hover:shadow-card-hover"
      >
        プロンプトを追加…
      </button>
    );
  }

  return (
    <div
      ref={containerRef}
      onKeyDown={(e) => {
        // IME の変換中の Esc / Enter は変換の操作なので触らない
        if (e.nativeEvent.isComposing) return;
        if (e.key === "Escape" || (e.key === "Enter" && (e.ctrlKey || e.metaKey))) {
          e.preventDefault();
          void finish("save");
        }
      }}
      aria-busy={saving}
      className="rounded-lg border border-[var(--border)] bg-[var(--card)] px-4 pt-3 pb-2 shadow-raised"
    >
      <input
        value={draft.title}
        onChange={(e) => update({ title: e.target.value })}
        readOnly={saving}
        placeholder="タイトル（任意）"
        aria-label="タイトル"
        maxLength={100}
        className="w-full bg-transparent text-[15px] leading-snug font-medium outline-none placeholder:text-[var(--muted)]"
      />
      <FieldError errors={error?.fieldErrors?.title} />
      {/* 本文から書き始められるようにする（タイトルは任意）。
          field-sizing で内容に合わせて伸び、長くなったら中でスクロールする */}
      <textarea
        value={draft.body}
        onChange={(e) => update({ body: e.target.value })}
        readOnly={saving}
        placeholder="プロンプト本文"
        aria-label="プロンプト本文"
        autoFocus
        rows={3}
        className="mt-2 block max-h-[50vh] min-h-20 w-full resize-none bg-transparent text-sm leading-relaxed outline-none field-sizing-content placeholder:text-[var(--muted)]"
      />
      <FieldError errors={error?.fieldErrors?.body} />
      <div className="mt-2">
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
      <div className="-mr-2 mt-2 flex items-center justify-end gap-2">
        {filled ? (
          <button
            type="button"
            onClick={() => void finish("discard")}
            disabled={saving}
            title="入力を破棄して閉じる"
            className="rounded-md px-3 py-1.5 text-sm text-[var(--muted)] hover:bg-[var(--chip)] hover:text-[var(--foreground)] disabled:opacity-40"
          >
            キャンセル
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => void finish("save")}
          disabled={saving}
          title={filled ? "保存して閉じる（Ctrl+Enter）" : "閉じる（Esc）"}
          aria-keyshortcuts="Control+Enter Meta+Enter"
          className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors disabled:opacity-40 ${
            filled
              ? "bg-[var(--foreground)] text-[var(--card)] hover:bg-[var(--muted-strong)]"
              : "text-[var(--foreground)] hover:bg-[var(--chip)]"
          }`}
        >
          {saving ? "保存中…" : filled ? "保存" : "閉じる"}
        </button>
      </div>
    </div>
  );
}
