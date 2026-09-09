import type { LucideIcon } from "lucide-react";

const sizeClass = {
  sm: "size-10",
  lg: "size-16",
} as const;

const iconSize = {
  sm: 20,
  lg: 30,
} as const;

/**
 * 元デザインの 3D イラストの代わり。淡青の円に lucide アイコンを載せる。
 * 装飾なので常に aria-hidden。
 */
export function IconBadge({
  icon: Icon,
  size = "sm",
  className = "",
}: {
  icon: LucideIcon;
  size?: keyof typeof sizeClass;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-[var(--lp-soft-blue)] text-[var(--lp-ink)] ${sizeClass[size]} ${className}`}
    >
      <Icon size={iconSize[size]} strokeWidth={1.75} />
    </span>
  );
}
