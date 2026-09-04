import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-sm py-16 text-center">
      <h1 className="text-2xl font-bold">ページが見つかりません</h1>
      <p className="mt-4 text-sm text-zinc-600">
        URLが変更されたか、削除された可能性があります。
      </p>
      <Link
        href="/"
        className="mt-8 inline-block rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white"
      >
        トップへ戻る
      </Link>
    </div>
  );
}
