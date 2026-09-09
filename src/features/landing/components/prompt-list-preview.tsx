import { Check, Copy, LayoutGrid, List, Pin } from "lucide-react";
import { preview } from "@/features/landing/content";
import { LpCard } from "@/features/landing/components/lp-card";

/**
 * 収益チャート相当。ログイン後の一覧がどう見えるかを静的なモックで見せる。
 * 中のチップやボタン風の要素は全部 span（本物の操作対象だと誤解させない）。
 */
export function PromptListPreview() {
  return (
    <LpCard tone="white" className="md:col-span-2">
      {/* 見出し行は 65px。右に円形の表示切替（飾り） */}
      <div className="flex min-h-[65px] items-center justify-between gap-3 border-b border-[var(--lp-line)] pb-3">
        <h2 className="text-lg font-bold">{preview.title}</h2>
        <div aria-hidden="true" className="flex gap-2">
          <span className="inline-flex size-9 items-center justify-center rounded-full bg-[var(--lp-ink)] text-[var(--lp-surface)]">
            <LayoutGrid size={16} />
          </span>
          <span className="inline-flex size-9 items-center justify-center rounded-full border border-[var(--lp-line)] text-[var(--lp-muted)]">
            <List size={16} />
          </span>
        </div>
      </div>

      <div
        role="group"
        aria-label={preview.caption}
        className="lp-ruled relative mt-4 grid gap-3 py-2 sm:grid-cols-2"
      >
        {preview.cards.map((card, i) => (
          <div
            key={card.body}
            className="relative rounded-[var(--lp-radius-lg)] sm:last:col-span-2 border border-[var(--lp-line)] bg-[var(--lp-surface)] p-3 shadow-sm"
          >
            <div className="flex items-start justify-between gap-2">
              {card.title ? <p className="text-sm font-medium">{card.title}</p> : null}
              {card.pinned ? (
                <span aria-hidden="true" className="ml-auto text-[var(--lp-muted)]">
                  <Pin size={14} />
                </span>
              ) : null}
            </div>
            <p className="mt-1 line-clamp-2 text-sm text-[var(--lp-muted)]">{card.body}</p>
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              {card.tags.map((t) => (
                <span
                  key={t}
                  className="rounded-full bg-[var(--lp-soft-blue)] px-2 py-0.5 text-[11px] text-[var(--lp-ink)]"
                >
                  #{t}
                </span>
              ))}
              <span className="ml-auto inline-flex items-center gap-1 text-xs text-[var(--lp-muted)]">
                <Copy size={12} aria-hidden="true" />
                コピー
              </span>
            </div>
            {/* 中央右のツールチップ相当。1枚目にだけ「コピーしました」を浮かべる */}
            {i === 0 ? (
              <span className="absolute -top-2 right-3 inline-flex items-center gap-1 rounded-full bg-[var(--lp-ink)] px-2.5 py-1 text-[11px] font-medium text-[var(--lp-surface)] shadow-sm">
                <Check size={12} aria-hidden="true" />
                {preview.toast}
              </span>
            ) : null}
          </div>
        ))}
      </div>
    </LpCard>
  );
}
