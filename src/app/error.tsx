"use client";

import { useEffect } from "react";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // クライアント側では digest のみログする（詳細はサーバーログで確認）
    console.error("page error", error.digest ?? error.message);
  }, [error]);

  return (
    <div className="mx-auto max-w-sm py-16 text-center">
      <h1 className="text-2xl font-bold">エラーが発生しました</h1>
      <p className="mt-4 text-sm text-zinc-600">
        時間をおいて再試行してください。解決しない場合はお問い合わせください。
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-8 rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white"
      >
        再試行
      </button>
    </div>
  );
}
