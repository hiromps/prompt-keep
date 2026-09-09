import Link from "next/link";
import { Bookmark } from "lucide-react";
import { hero } from "@/features/landing/content";
import { focusRing, pillWhite } from "@/features/landing/classes";
import { IconBadge } from "@/features/landing/components/icon-badge";
import { LpCard } from "@/features/landing/components/lp-card";

/**
 * 残高カード相当。ネイビーのグラデーションに、右上の淡い「ホールド」領域、
 * 左のマーク、右下の白いピル（主 CTA）を置く。
 */
export function HeroCtaCard() {
  return (
    <LpCard tone="navy" className="flex min-h-[190px] flex-col rounded-[30px] md:col-span-2">
      {/* 右上の淡い領域。61% × 70px、左下だけ 40px の丸み */}
      <div className="lp-navy-hold absolute top-0 right-0 flex h-[70px] w-[61%] items-center justify-end rounded-bl-[40px] px-4">
        <p className="lp-navy-muted text-right text-xs leading-snug">{hero.cardEyebrow}</p>
      </div>

      <div className="relative flex flex-1 gap-4 pt-[52px] pb-14 sm:pb-2">
        <div className="flex w-[76px] shrink-0 items-start">
          <IconBadge icon={Bookmark} size="sm" className="bg-[var(--lp-surface)]" />
        </div>
        {/* 左から 107px の位置の縦罫線（マークと本文の区切り） */}
        <div aria-hidden="true" className="lp-navy-line w-px self-stretch" />
        <div className="min-w-0 flex-1 sm:pr-40">
          <h2 className="text-lg leading-snug font-bold sm:text-xl">{hero.cardTitle}</h2>
          <p className="lp-navy-muted mt-1 text-sm">{hero.cardBody}</p>
          <Link
            href="/prompts"
            className={`lp-navy-muted mt-3 inline-block text-sm underline underline-offset-4 hover:text-[var(--lp-surface)] ${focusRing}`}
          >
            {hero.secondaryCta}
          </Link>
        </div>
      </div>

      {/* 白いピルは右から 10px・下から 14px */}
      <Link href="/signin" className={`${pillWhite} absolute right-[10px] bottom-[14px]`}>
        {hero.primaryCta}
      </Link>
    </LpCard>
  );
}
