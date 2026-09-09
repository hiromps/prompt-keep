import Link from "next/link";
import { Copy } from "lucide-react";
import type { RankingEntry } from "@/features/ranking/queries";

/**
 * ランキングの表。行を押すと共有ページ（/s/<token>）へ飛ぶ。
 * 本文は冒頭だけ（ビューが 120 文字で切っている）。全文とコピーは共有ページで。
 */
export function RankingList({ entries }: { entries: RankingEntry[] }) {
  if (entries.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-[var(--border)] p-10 text-center text-sm text-[var(--muted)]">
        まだランキングはありません。共有したプロンプトがコピーされると、ここに並びます。
      </p>
    );
  }

  return (
    <ol className="divide-y divide-[var(--border)] rounded-lg border border-[var(--border)] bg-[var(--card)]">
      {entries.map((e) => (
        <li key={e.token}>
          <Link
            href={`/s/${e.token}`}
            className="flex gap-3 px-3 py-3 hover:bg-[var(--chip)] sm:px-4"
          >
            <span
              className={`w-8 shrink-0 pt-0.5 text-right text-sm font-bold tabular-nums ${
                e.rank <= 3 ? "text-[var(--foreground)]" : "text-[var(--muted)]"
              }`}
            >
              {e.rank}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium break-words">
                {e.title || "無題のプロンプト"}
              </span>
              {e.snippet ? (
                <span className="mt-0.5 line-clamp-2 block text-xs break-words text-[var(--muted-strong)]">
                  {e.snippet}
                </span>
              ) : null}
              {e.tags.length > 0 ? (
                <span className="mt-1.5 flex flex-wrap gap-1">
                  {e.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-[var(--chip)] px-2 py-0.5 text-[11px] text-[var(--muted-strong)]"
                    >
                      {tag}
                    </span>
                  ))}
                </span>
              ) : null}
            </span>
            <span className="inline-flex shrink-0 items-center gap-1 self-start pt-0.5 text-xs whitespace-nowrap text-[var(--muted)]">
              <Copy className="size-3.5" aria-hidden="true" />
              {e.copyCount.toLocaleString("ja-JP")}
            </span>
          </Link>
        </li>
      ))}
    </ol>
  );
}
