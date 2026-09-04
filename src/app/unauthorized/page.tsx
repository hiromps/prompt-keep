import Link from "next/link";

export const metadata = { title: "権限がありません" };

/** 認可エラー（403）表示用ページ。権限不足時に redirect される。 */
export default function UnauthorizedPage() {
  return (
    <div className="mx-auto max-w-sm px-4 py-16 text-center">
      <h1 className="text-2xl font-bold">権限がありません</h1>
      <p className="mt-4 text-sm text-zinc-600">
        このページを表示する権限がありません。必要な場合は管理者にお問い合わせください。
      </p>
      <Link
        href="/prompts"
        className="mt-8 inline-block rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white"
      >
        プロンプト一覧へ戻る
      </Link>
    </div>
  );
}
