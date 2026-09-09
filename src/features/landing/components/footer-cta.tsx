import Link from "next/link";
import { FolderOpen } from "lucide-react";
import { footer } from "@/features/landing/content";
import { focusRing, pillNavy } from "@/features/landing/classes";
import { IconBadge } from "@/features/landing/components/icon-badge";
import { LpCard } from "@/features/landing/components/lp-card";

/**
 * 注文履歴（空状態）カード相当。見出しは左上、イラスト（代替バッジ）は中央、
 * 2 行のメッセージと CTA を下に置く。
 */
export function FooterCta() {
  return (
    <LpCard tone="white" className="flex min-h-[280px] flex-col md:col-span-2">
      <h2 className="text-lg font-bold">{footer.title}</h2>
      <div className="flex flex-1 flex-col items-center justify-center gap-5 py-6 text-center">
        <IconBadge icon={FolderOpen} size="lg" />
        <p className="text-sm leading-relaxed text-[var(--lp-muted)]">
          {footer.lines[0]}
          <br />
          {footer.lines[1]}
        </p>
        <Link href="/signin" className={pillNavy}>
          {footer.cta}
        </Link>
        <Link
          href="/ranking"
          className={`text-sm text-[var(--lp-muted)] underline underline-offset-4 hover:text-[var(--lp-ink)] ${focusRing}`}
        >
          {footer.rankingLink}
        </Link>
      </div>
    </LpCard>
  );
}
