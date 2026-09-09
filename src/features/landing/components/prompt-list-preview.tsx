import { Archive, Check, Copy, Pencil, Share2, Trash2 } from "lucide-react";
import { preview } from "@/features/landing/content";
import { LpCard } from "@/features/landing/components/lp-card";

const actionIcon = "size-4";

/**
 * ログイン後の一覧（prompt-board.tsx / prompt-card.tsx）と同じ見た目の静的モック。
 * 本物と同じく縦積みの columns レイアウトで、狭い画面は 2 列、md 以上は 3 列。
 * カードの構成（タイトル行の ★ / 本文 / タグ / 下段のアイコン列）も本物に合わせる。
 * 中のチップやボタン風の要素は全部 span（本物の操作対象だと誤解させない）。
 */
export function PromptListPreview() {
  return (
    <LpCard tone="white" className="md:col-span-2">
      <div className="flex min-h-[48px] items-center border-b border-[var(--lp-line)] pb-3">
        <h2 className="text-lg font-bold">{preview.title}</h2>
      </div>

      <div role="group" aria-label={preview.caption} className="mt-4 columns-2 gap-3 md:columns-3">
        {preview.cards.map((card, i) => (
          <div
            key={card.body}
            className="relative mb-3 break-inside-avoid rounded-lg border border-[var(--lp-line)] bg-[var(--lp-surface)] p-3 shadow-sm"
          >
            {/* タイトル行。本物と同じく右端に ★（ピン留め） */}
            <div className="flex items-start justify-between gap-2">
              {card.title ? (
                <p className="text-sm font-medium break-words">{card.title}</p>
              ) : (
                <span aria-hidden="true" />
              )}
              <span
                aria-hidden="true"
                className={`shrink-0 px-1 text-sm ${card.pinned ? "text-[var(--lp-ink)]" : "text-[var(--lp-muted)]"}`}
              >
                {card.pinned ? "★" : "☆"}
              </span>
            </div>
            <p className="mt-1.5 line-clamp-6 text-sm break-words whitespace-pre-wrap text-[var(--lp-muted)]">
              {card.body}
            </p>
            {card.tags.length ? (
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
            {/* 下段のアイコン列。1 枚目だけコピー直後（緑のチェック）にしておく */}
            <div aria-hidden="true" className="-mx-1 mt-2 flex items-center justify-between text-[var(--lp-muted)]">
              <span className="rounded px-2 py-1">
                {i === 0 ? (
                  <Check className={`${actionIcon} text-[var(--lp-green)]`} />
                ) : (
                  <Copy className={actionIcon} />
                )}
              </span>
              <span className="rounded px-2 py-1">
                <Pencil className={actionIcon} />
              </span>
              <span className="rounded px-2 py-1">
                <Share2 className={actionIcon} />
              </span>
              <span className="rounded px-2 py-1">
                <Archive className={actionIcon} />
              </span>
              <span className="rounded px-2 py-1">
                <Trash2 className={actionIcon} />
              </span>
            </div>
            {/* 「コピーしました」はカードの下端・左寄せに浮かべる（右上の ★ と被らない位置） */}
            {i === 0 ? (
              <span
                aria-hidden="true"
                className="absolute -bottom-2.5 left-3 inline-flex items-center gap-1 rounded-full bg-[var(--lp-ink)] px-2.5 py-1 text-[11px] font-medium whitespace-nowrap text-[var(--lp-surface)] shadow-sm"
              >
                <Check size={12} />
                {preview.toast}
              </span>
            ) : null}
          </div>
        ))}
      </div>
    </LpCard>
  );
}
