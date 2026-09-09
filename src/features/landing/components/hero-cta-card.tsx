import Image from "next/image";
import Link from "next/link";
import { Bookmark } from "lucide-react";
import heroShare from "../../../../public/images/hero-share.png";
import { hero } from "@/features/landing/content";
import { focusRing, pillWhite } from "@/features/landing/classes";
import { IconBadge } from "@/features/landing/components/icon-badge";
import { LpCard } from "@/features/landing/components/lp-card";

/**
 * 残高カード相当。ネイビーのグラデーションに、右上の淡い「ホールド」領域、
 * 左のマーク、右側の 3D イラスト、白いピル（主 CTA）を置く。
 *
 * イラストは static import にして、next/image に実寸を渡す（レイアウトシフトを
 * 防ぐ）。元は 1024px の透過 PNG だが、配信時は sizes に合わせて縮小・WebP 化される。
 */
export function HeroCtaCard() {
  return (
    <LpCard tone="navy" className="flex min-h-[190px] flex-col md:col-span-2">
      {/* 右上の淡い領域。61% × 70px、左下だけ 40px の丸み */}
      <div className="lp-navy-hold absolute top-0 right-0 flex h-[70px] w-[61%] items-center justify-end rounded-bl-[40px] px-4">
        <p className="lp-navy-muted text-right text-xs leading-snug">{hero.cardEyebrow}</p>
      </div>

      <div className="relative flex flex-1 items-center gap-4 pt-[52px] pb-2">
        {/*
          マークと縦罫線。md（カード幅 ≒ 470px）ではイラストと並べる幅が無いので、
          lg 以上でだけ出す
        */}
        <div className="hidden w-[76px] shrink-0 items-start self-start lg:flex">
          <IconBadge icon={Bookmark} size="sm" className="bg-[var(--lp-surface)]" />
        </div>
        {/* 左から 107px の位置の縦罫線（マークと本文の区切り） */}
        <div aria-hidden="true" className="lp-navy-line hidden w-px self-stretch lg:block" />

        <div className="flex min-w-0 flex-1 flex-col items-start self-start">
          <h2 className="text-lg leading-snug font-bold sm:text-xl">{hero.cardTitle}</h2>
          <p className="lp-navy-muted mt-1 text-sm">{hero.cardBody}</p>
          <Link
            href="/prompts"
            className={`lp-navy-muted mt-3 inline-block text-sm underline underline-offset-4 hover:text-[var(--lp-surface)] ${focusRing}`}
          >
            {hero.secondaryCta}
          </Link>
          {/* 本文の流れに置く。絶対配置にするとイラストの下に隠れる */}
          <Link href="/signin" className={`${pillWhite} mt-5`}>
            {hero.primaryCta}
          </Link>
        </div>

        {/*
          3D イラスト。幅はカード幅に合わせて段階的に。sm 以上ではカードの下端から
          少しはみ出させて奥行きを出す（overflow-hidden で切れる）
        */}
        <div className="w-[120px] shrink-0 self-end sm:-mb-8 sm:w-[170px] lg:-mr-2 lg:w-[250px]">
          <Image
            src={heroShare}
            alt={hero.imageAlt}
            priority
            sizes="(min-width: 1024px) 250px, (min-width: 640px) 170px, 120px"
            className="h-auto w-full drop-shadow-[0_18px_30px_rgba(0,0,0,0.35)]"
          />
        </div>
      </div>
    </LpCard>
  );
}
