import { features } from "@/features/landing/content";
import { IconBadge } from "@/features/landing/components/icon-badge";
import { LpCard } from "@/features/landing/components/lp-card";

/**
 * 統計カード 4 枚相当。モバイルは 2 列、md 以上は 4 列。
 * 値（22px 太字）の位置に機能名、ラベル（12px）の位置に説明を置く。
 */
export function FeatureGrid() {
  return (
    <section
      aria-label="できること"
      className="grid grid-cols-2 gap-[9px] md:col-span-3 md:grid-cols-4"
    >
      {features.map((f) => (
        <LpCard key={f.title} as="article" tone="pale" className="flex min-h-[151px] flex-col">
          <h3 className="text-[22px] leading-none font-bold">{f.title}</h3>
          <p className="mt-2 text-xs leading-relaxed text-[var(--lp-muted)]">{f.body}</p>
          <IconBadge icon={f.icon} size="sm" className="mt-auto self-end" />
        </LpCard>
      ))}
    </section>
  );
}
