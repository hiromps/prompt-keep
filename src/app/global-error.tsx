"use client";

/** ルートレイアウト自体のエラーを受ける最終防衛線。html/body を自前で描画する必要がある。 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="ja">
      <body style={{ fontFamily: "sans-serif", textAlign: "center", padding: "4rem 1rem" }}>
        <h1>エラーが発生しました</h1>
        <p>時間をおいて再度アクセスしてください。</p>
        {error.digest ? <p style={{ color: "#888", fontSize: 12 }}>digest: {error.digest}</p> : null}
        <button type="button" onClick={reset} style={{ marginTop: "1rem", padding: "0.5rem 1rem" }}>
          再試行
        </button>
      </body>
    </html>
  );
}
