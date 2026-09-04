import Link from "next/link";

/**
 * 公開LP（サンプルA）。認証不要でアクセスできる。
 * プロジェクト開始時はこのページをプロダクトのLPに置き換える。
 */
export default function HomePage() {
  return (
    <div className="py-12">
      <section className="text-center">
        <h1 className="text-4xl font-bold tracking-tight">MVPを、今日はじめる</h1>
        <p className="mx-auto mt-4 max-w-xl text-zinc-600">
          Next.js App Router + Auth.js + Supabase PostgreSQL。
          認証・DB・型安全な土台が最初から入ったスターターです。
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link
            href="/signin"
            className="rounded-md bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white"
          >
            Googleで始める
          </Link>
          <Link
            href="/dashboard"
            className="rounded-md border border-zinc-300 px-5 py-2.5 text-sm font-medium"
          >
            ダッシュボードへ
          </Link>
        </div>
      </section>
      <section className="mx-auto mt-16 grid max-w-3xl gap-6 sm:grid-cols-3">
        {[
          { title: "認証込み", body: "Auth.js + Google OAuth。保護ルートと権限検証を標準装備。" },
          { title: "型安全", body: "TypeScript strict + Zod + 型付き環境変数で実行前に壊れる。" },
          { title: "サーバー主導", body: "データアクセスは Server Components / Actions に限定。" },
        ].map((f) => (
          <div key={f.title} className="rounded-lg border border-zinc-200 p-4 text-left">
            <h2 className="font-semibold">{f.title}</h2>
            <p className="mt-2 text-sm text-zinc-600">{f.body}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
