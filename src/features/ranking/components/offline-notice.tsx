"use client";

import { useEffect, useState } from "react";

/**
 * オフラインのときだけ「これは保存された版です」と知らせる。
 * /ranking は Service Worker がキャッシュする唯一のページなので（ADR 0009 §5）、
 * 今見ているのが最新か古いかを利用者が判断できるようにする。
 * fetchedAt はサーバーが描画した時刻（ISO 文字列）。
 */
export function OfflineNotice({ fetchedAt }: { fetchedAt: string }) {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  if (!offline) return null;

  return (
    <p
      role="status"
      className="mb-4 rounded-md border border-[var(--border)] bg-[var(--chip)] px-3 py-2 text-xs text-[var(--muted-strong)]"
    >
      オフラインです。最後に取得したランキングを表示しています（
      {new Date(fetchedAt).toLocaleString("ja-JP")}）。
    </p>
  );
}
