import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/auth/guards";

/**
 * 公開LP。認証不要でアクセスできる。
 * ログイン済みの人にとってのトップはプロンプト一覧なので、そちらへ送る
 * （ヘッダーのサイト名を押して LP に戻されるのは、使っている最中には邪魔なだけ）。
 * JWT を見るだけで DB は引かない。
 */
export default async function HomePage() {
  if (await getSessionUser()) redirect("/prompts");

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-12">
      <section className="text-center">
        <h1 className="text-4xl font-bold tracking-tight">プロンプトを、探さない</h1>
        <p className="mx-auto mt-4 max-w-xl text-[var(--muted-strong)]">
          よく使うAIプロンプトを1か所に貯めて、タグと検索ですぐ見つけ、ワンクリックでコピーする。
          チャット履歴やメモアプリを掘り返す時間をなくすための個人用プロンプト管理です。
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link
            href="/signin"
            className="rounded-md bg-[var(--foreground)] px-5 py-2.5 text-sm font-medium text-[var(--card)]"
          >
            Googleで始める
          </Link>
          <Link
            href="/prompts"
            className="rounded-md border border-[var(--border)] px-5 py-2.5 text-sm font-medium"
          >
            プロンプト一覧へ
          </Link>
        </div>
      </section>
      <section className="mx-auto mt-16 grid max-w-3xl gap-6 sm:grid-cols-3">
        {[
          {
            title: "貯める",
            body: "タイトルなしでも保存できるクイック入力。タグはあとから付け足せます。",
          },
          {
            title: "探す",
            body: "タグでの絞り込みと、タイトル・本文・タグを横断する全文検索。",
          },
          {
            title: "使う",
            body: "カードのコピーボタンで本文をそのままクリップボードへ。",
          },
        ].map((f) => (
          <div
            key={f.title}
            className="rounded-lg border border-[var(--border)] p-4 text-left"
          >
            <h2 className="font-semibold">{f.title}</h2>
            <p className="mt-2 text-sm text-[var(--muted-strong)]">{f.body}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
