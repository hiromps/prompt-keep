import type { Metadata } from "next";
import Link from "next/link";
import { getSessionUser } from "@/auth/guards";
import {
  listRanking,
  RANKING_MAX_LIMIT,
  RANKING_PUBLIC_LIMIT,
} from "@/features/ranking/queries";
import { RankingList } from "@/features/ranking/components/ranking-list";
import { OfflineNotice } from "@/features/ranking/components/offline-notice";

/**
 * 共有プロンプトのランキング。**ログインなしで見られる**（docs/decisions/0009）。
 * 未ログインは 10 位まで、ログインすると 100 位まで。
 * Service Worker がこのページだけキャッシュするので、オフラインでも最後の表示が開く。
 */
export const metadata: Metadata = {
  title: "ランキング",
  description: "シェアされて最も多くコピーされたプロンプト",
};

/** 停止した共有をすぐ消すため、毎回引き直す */
export const dynamic = "force-dynamic";

export default async function RankingPage() {
  const user = await getSessionUser();
  const limit = user ? RANKING_MAX_LIMIT : RANKING_PUBLIC_LIMIT;
  const entries = await listRanking(limit);
  const fetchedAt = new Date().toISOString();

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8">
      <h1 className="text-xl font-bold">シェアされたプロンプトのランキング</h1>
      <p className="mt-1 mb-5 text-sm text-[var(--muted)]">
        共有リンクから受け取った人がコピーした回数の多い順。
        {user ? `上位 ${RANKING_MAX_LIMIT} 件まで表示しています。` : `上位 ${RANKING_PUBLIC_LIMIT} 件まで表示しています。`}
      </p>

      <OfflineNotice fetchedAt={fetchedAt} />

      <RankingList entries={entries} />

      {!user ? (
        <div className="mt-6 rounded-lg border border-[var(--border)] p-4 text-center">
          <p className="text-sm text-[var(--muted-strong)]">
            ログインすると {RANKING_MAX_LIMIT} 位まで見られます。
          </p>
          <Link
            href="/signin?callbackUrl=%2Franking"
            className="mt-3 inline-block rounded-md bg-[var(--foreground)] px-4 py-2 text-sm font-medium text-[var(--card)]"
          >
            Googleでログインして続きを見る
          </Link>
        </div>
      ) : null}
    </div>
  );
}
