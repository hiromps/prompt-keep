/** LP 内で繰り返すクラス列。色は必ず var(--lp-*) を参照する。 */

export const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lp-periwinkle)]";

const pillBase = `inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-medium whitespace-nowrap transition-opacity hover:opacity-90 motion-reduce:transition-none ${focusRing}`;

/** ネイビー塗りのピル（白いカードの主アクション） */
export const pillNavy = `${pillBase} bg-[var(--lp-ink)] text-[var(--lp-surface)]`;

/** 白いピル（ネイビーカードの主アクション） */
export const pillWhite = `${pillBase} bg-[var(--lp-surface)] text-[var(--lp-ink)]`;

/** 枠線だけのピル。無効表示にも使う */
export const pillOutline = `${pillBase} border border-[var(--lp-line)] bg-[var(--lp-surface)] text-[var(--lp-ink)]`;
