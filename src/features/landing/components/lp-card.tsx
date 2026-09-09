import type { ReactNode } from "react";

type Tone = "navy" | "pale" | "white";

const toneClass: Record<Tone, string> = {
  navy: "lp-card-navy",
  pale: "lp-card-pale",
  white: "bg-[var(--lp-surface)]",
};

/**
 * LP のカード。design.md の「大きなカードは 22px 角丸」を共通にし、
 * 見た目の系統（ネイビー / 淡青 / 白）だけ tone で切り替える。
 */
export function LpCard({
  tone,
  as: Tag = "section",
  className = "",
  children,
}: {
  tone: Tone;
  as?: "section" | "article" | "div";
  className?: string;
  children: ReactNode;
}) {
  return (
    <Tag
      className={`relative overflow-hidden rounded-[var(--lp-radius-xl)] p-4 sm:p-5 ${toneClass[tone]} ${className}`}
    >
      {children}
    </Tag>
  );
}
