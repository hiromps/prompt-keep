"use client";

import { useState } from "react";
import Link from "next/link";
import { Archive, Check, Copy, Pencil, RotateCcw, Share2, Trash2 } from "lucide-react";
import { preview } from "@/features/landing/content";
import { pillNavy } from "@/features/landing/classes";
import { LpCard } from "@/features/landing/components/lp-card";
import { DemoDialog } from "@/features/landing/components/demo-dialog";

/**
 * ログイン後の一覧（prompt-board / prompt-card）を再現した**触れるデモ**。
 *
 * ピン留め・コピー・編集・アーカイブ・ゴミ箱は本物と同じ操作感で動くが、
 * 変更はこの画面の中（React の state）だけで、保存も通信もしない。
 * 共有だけは実際にリンクを発行できないので、同じ導線でダイアログを開き
 * 登録を促す（デモでできないことを黙って無効化しない）。
 *
 * 見た目は本物に合わせる: 縦積みの columns（狭い画面 2 列 / md 3 列）、
 * タイトル行の ★、本文、タグ、下段のアイコン列。
 */

type DemoCard = {
  id: string;
  title: string;
  body: string;
  tags: string[];
  pinned: boolean;
};

const INITIAL: DemoCard[] = preview.cards.map((c, i) => ({
  id: String(i),
  title: c.title,
  body: c.body,
  tags: [...c.tags],
  pinned: c.pinned,
}));

/** 消したカードを元の位置へ戻せるように、抜いた位置も覚えておく */
type Removed = { card: DemoCard; index: number; message: string };

const actionButton =
  "rounded px-1 py-2 text-[var(--lp-muted)] transition-colors hover:bg-[var(--lp-soft-blue)] hover:text-[var(--lp-ink)] motion-reduce:transition-none sm:px-2";
const actionIcon = "size-4";

export function PromptListPreview() {
  const [cards, setCards] = useState<DemoCard[]>(INITIAL);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [removed, setRemoved] = useState<Removed | null>(null);
  const [editing, setEditing] = useState<DemoCard | null>(null);
  const [sharing, setSharing] = useState(false);

  const dirty = removed !== null || cards !== INITIAL;

  const copy = async (card: DemoCard) => {
    try {
      await navigator.clipboard.writeText(card.body);
    } catch {
      // クリップボードが使えなくても、デモとしては「押した」ことを見せる
    }
    setCopiedId(card.id);
    window.setTimeout(() => setCopiedId((id) => (id === card.id ? null : id)), 1800);
  };

  const remove = (card: DemoCard, message: string) => {
    setCards((prev) => {
      const index = prev.findIndex((c) => c.id === card.id);
      if (index < 0) return prev;
      setRemoved({ card, index, message });
      return prev.filter((c) => c.id !== card.id);
    });
  };

  const undo = () => {
    if (!removed) return;
    setCards((prev) => {
      const next = [...prev];
      next.splice(Math.min(removed.index, next.length), 0, removed.card);
      return next;
    });
    setRemoved(null);
  };

  const reset = () => {
    setCards(INITIAL);
    setRemoved(null);
    setCopiedId(null);
  };

  return (
    <LpCard tone="white" className="md:col-span-2">
      <div className="flex min-h-[48px] flex-wrap items-center justify-between gap-2 border-b border-[var(--lp-line)] pb-3">
        <h2 className="text-lg font-bold">{preview.title}</h2>
        {dirty ? (
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center gap-1.5 rounded-full border border-[var(--lp-line)] px-3 py-1.5 text-xs text-[var(--lp-muted)] hover:text-[var(--lp-ink)]"
          >
            <RotateCcw className="size-3.5" aria-hidden="true" />
            {preview.resetLabel}
          </button>
        ) : null}
      </div>

      <p className="mt-3 text-xs text-[var(--lp-muted)]">{preview.hint}</p>

      {/*
        列数はカードの実幅から決める。このカードは md でグリッドの 2/3 幅しか無いので、
        320px 級（1 枚 106px）と md（1 枚 112px）ではアイコン 5 つがはみ出す。
        タップ領域を削らずに収まる幅になってから列を増やす。
      */}
      <div className="mt-3 columns-1 gap-3 min-[360px]:columns-2 lg:columns-3">
        {cards.map((card) => (
          <article
            key={card.id}
            className="relative mb-3 break-inside-avoid rounded-lg border border-[var(--lp-line)] bg-[var(--lp-surface)] p-3 shadow-sm"
          >
            <div className="flex items-start justify-between gap-2">
              {card.title ? (
                <h3 className="text-sm font-medium break-words">{card.title}</h3>
              ) : (
                <span aria-hidden="true" />
              )}
              <button
                type="button"
                onClick={() =>
                  setCards((prev) =>
                    prev.map((c) => (c.id === card.id ? { ...c, pinned: !c.pinned } : c)),
                  )
                }
                title={card.pinned ? "ピン留めを外す" : "ピン留めする"}
                aria-label={card.pinned ? "ピン留めを外す" : "ピン留めする"}
                className={`shrink-0 rounded px-1 text-sm ${
                  card.pinned ? "text-[var(--lp-ink)]" : "text-[var(--lp-muted)]"
                }`}
              >
                {card.pinned ? "★" : "☆"}
              </button>
            </div>

            <p className="mt-1.5 line-clamp-6 text-sm break-words whitespace-pre-wrap text-[var(--lp-muted)]">
              {card.body}
            </p>

            {card.tags.length > 0 ? (
              <ul className="mt-2 flex flex-wrap gap-1">
                {card.tags.map((t) => (
                  <li
                    key={t}
                    className="rounded-full bg-[var(--lp-soft-blue)] px-2 py-0.5 text-[11px] text-[var(--lp-ink)]"
                  >
                    {t}
                  </li>
                ))}
              </ul>
            ) : null}

            {/* 下段のアイコン列。狭い画面でも 5 つが収まるよう左右の余白を詰める */}
            <div className="-mx-1 mt-2 flex items-center justify-between">
              <button
                type="button"
                onClick={() => copy(card)}
                title="本文をコピー"
                aria-label="本文をコピー"
                className={actionButton}
              >
                {copiedId === card.id ? (
                  <Check className={`${actionIcon} text-[var(--lp-green)]`} aria-hidden="true" />
                ) : (
                  <Copy className={actionIcon} aria-hidden="true" />
                )}
              </button>
              <button
                type="button"
                onClick={() => setEditing(card)}
                title="編集"
                aria-label="編集"
                className={actionButton}
              >
                <Pencil className={actionIcon} aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => setSharing(true)}
                title="共有"
                aria-label="共有"
                className={actionButton}
              >
                <Share2 className={actionIcon} aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => remove(card, preview.archivedToast)}
                title="アーカイブ"
                aria-label="アーカイブ"
                className={actionButton}
              >
                <Archive className={actionIcon} aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => remove(card, preview.trashedToast)}
                title="ゴミ箱へ移動"
                aria-label="ゴミ箱へ移動"
                className={actionButton}
              >
                <Trash2 className={actionIcon} aria-hidden="true" />
              </button>
            </div>

            {copiedId === card.id ? (
              <span
                aria-hidden="true"
                className="absolute -bottom-2.5 left-3 inline-flex items-center gap-1 rounded-full bg-[var(--lp-ink)] px-2.5 py-1 text-[11px] font-medium whitespace-nowrap text-[var(--lp-surface)] shadow-sm"
              >
                <Check size={12} />
                {preview.toast}
              </span>
            ) : null}
          </article>
        ))}
      </div>

      {/* 消したときの取り消し。本物には無いが、デモで戻せないと試しにくい */}
      {removed ? (
        <div className="mt-1 flex items-center justify-between gap-3 rounded-lg bg-[var(--lp-ink)] px-3 py-2 text-sm text-[var(--lp-surface)]">
          <span>{removed.message}</span>
          <button type="button" onClick={undo} className="font-medium underline underline-offset-4">
            {preview.undoLabel}
          </button>
        </div>
      ) : null}

      {/* 読み上げ用。操作の結果を目で追えない人にも伝える */}
      <span aria-live="polite" className="sr-only">
        {copiedId ? preview.toast : removed ? removed.message : ""}
      </span>

      {editing ? (
        <DemoDialog label={preview.editTitle} onClose={() => setEditing(null)}>
          <EditForm
            card={editing}
            onCancel={() => setEditing(null)}
            onSave={(next) => {
              setCards((prev) => prev.map((c) => (c.id === next.id ? next : c)));
              setEditing(null);
            }}
          />
        </DemoDialog>
      ) : null}

      {sharing ? (
        <DemoDialog label={preview.shareTitle} onClose={() => setSharing(false)}>
          <h3 className="text-base font-medium">{preview.shareTitle}</h3>
          <p className="mt-2 text-sm text-[var(--lp-muted)]">{preview.shareBody}</p>
          <p className="mt-3 rounded-md bg-[var(--lp-soft-blue)] px-3 py-2 text-xs text-[var(--lp-ink)]">
            {preview.shareNote}
          </p>
          <div className="mt-4 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setSharing(false)}
              className="rounded px-3 py-1.5 text-sm text-[var(--lp-muted)]"
            >
              {preview.shareClose}
            </button>
            <Link href="/signin" className={pillNavy}>
              {preview.shareCta}
            </Link>
          </div>
        </DemoDialog>
      ) : null}
    </LpCard>
  );
}

/** 編集フォーム。本物の編集モーダルと同じく、タイトルと本文だけを直す */
function EditForm({
  card,
  onSave,
  onCancel,
}: {
  card: DemoCard;
  onSave: (card: DemoCard) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(card.title);
  const [body, setBody] = useState(card.body);

  return (
    <>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder={preview.titlePlaceholder}
        aria-label={preview.titlePlaceholder}
        autoFocus
        className="w-full bg-transparent font-medium outline-none placeholder:text-[var(--lp-muted)]"
      />
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={preview.bodyPlaceholder}
        aria-label={preview.bodyPlaceholder}
        className="mt-3 min-h-40 flex-1 resize-none overflow-y-auto bg-transparent text-sm outline-none placeholder:text-[var(--lp-muted)]"
      />
      <div className="mt-4 flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded px-3 py-1.5 text-sm text-[var(--lp-muted)]"
        >
          {preview.editCancel}
        </button>
        <button
          type="button"
          onClick={() => onSave({ ...card, title: title.trim(), body })}
          className={pillNavy}
        >
          {preview.editSave}
        </button>
      </div>
    </>
  );
}
