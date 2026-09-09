import Link from "next/link";
import { Info, Smartphone } from "lucide-react";
import { install } from "@/features/landing/content";
import { pillNavy, pillOutline } from "@/features/landing/classes";
import { IconBadge } from "@/features/landing/components/icon-badge";
import { LpCard } from "@/features/landing/components/lp-card";

/**
 * 保険カード相当。右上に枠線だけの情報アイコン、右にイラスト（代替バッジ）、
 * 下辺にピルを 2 つ（主アクションと、無効表示のもの）。
 */
export function InstallPitchCard() {
  return (
    <LpCard tone="pale" className="flex min-h-[186px] flex-col">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-bold">{install.title}</h2>
          <p className="mt-1 text-sm leading-relaxed text-[var(--lp-muted)]">{install.body}</p>
        </div>
        <span
          aria-hidden="true"
          className="inline-flex size-7 shrink-0 items-center justify-center rounded-full border border-[var(--lp-ink)] text-[var(--lp-ink)]"
        >
          <Info size={14} />
        </span>
      </div>
      <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <Link href="/signin" className={pillNavy}>
            {install.primaryCta}
          </Link>
          {/* JS 無しで死んだ button disabled を置くより、最初から操作対象でない span にする */}
          <span aria-disabled="true" className={`${pillOutline} cursor-default opacity-60`}>
            {install.disabledCta}
          </span>
        </div>
        <IconBadge icon={Smartphone} size="lg" className="ml-auto" />
      </div>
    </LpCard>
  );
}
