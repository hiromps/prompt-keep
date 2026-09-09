import Link from "next/link";
import { howTo } from "@/features/landing/content";
import { pillNavy } from "@/features/landing/classes";
import { LpCard } from "@/features/landing/components/lp-card";

/**
 * マーチャントカード相当。白い外枠にネイビーの主アクション、
 * 中に 1px 枠・14px 角丸のネストした行を並べる。
 */
export function HowToSteps() {
  return (
    <LpCard tone="white" className="flex flex-col">
      <div className="flex min-h-[64px] flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold">{howTo.title}</h2>
        <Link href="/signin" className={pillNavy}>
          {howTo.cta}
        </Link>
      </div>
      <ol className="mt-2 flex flex-col gap-2">
        {howTo.steps.map((step, i) => (
          <li
            key={step.title}
            className="flex items-start gap-3 rounded-[14px] border border-[var(--lp-line)] px-3 py-3"
          >
            <span
              aria-hidden="true"
              className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-[var(--lp-soft-blue)] text-xs font-bold tabular-nums"
            >
              {i + 1}
            </span>
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-sm font-medium">
                {step.title}
                {i === 0 ? (
                  <span className="inline-flex shrink-0 items-center gap-1 text-[11px] font-normal whitespace-nowrap text-[var(--lp-muted)]">
                    <span aria-hidden="true" className="size-2 rounded-full bg-[var(--lp-green)]" />
                    1分
                  </span>
                ) : null}
              </p>
              <p className="mt-0.5 text-xs text-[var(--lp-muted)]">{step.body}</p>
            </div>
          </li>
        ))}
      </ol>
    </LpCard>
  );
}
