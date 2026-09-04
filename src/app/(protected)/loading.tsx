/**
 * 保護ルート（プロンプト一覧・プロフィール・管理）の読み込み中表示。
 *
 * これを src/app/loading.tsx に置くと全ルートが Suspense 境界に包まれ、
 * データ取得より先にシェルが flush される。その結果 notFound() を呼んでも
 * HTTP ステータスが 200 のままになる（/s/<token> の 404 が 200 で返っていた）。
 * 認証と DB 往復で待たされるのは保護ルートだけなので、ここへ下ろしている。
 */
export default function Loading() {
  return (
    <div className="flex items-center justify-center py-24">
      <div
        className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-900"
        role="status"
        aria-label="読み込み中"
      />
    </div>
  );
}
