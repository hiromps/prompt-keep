import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getSharedPrompt } from "@/features/prompts/shares";
import { CopyButton } from "@/features/prompts/components/copy-button";

/**
 * 共有されたプロンプトの公開ページ。**このアプリで唯一ログイン不要のデータ表示**。
 *
 * 見せるのは token を知っている人だけ。取得は getSharedPrompt に閉じており、
 * 返る列も固定されている（所有者は分からない）。
 *
 * タイトルに本文を出さない: タブ名・履歴・SNS のリンクプレビューへ中身が漏れる。
 */
export const metadata: Metadata = {
  title: "共有されたプロンプト",
  // 検索エンジンに拾わせない。リンクを知っている人だけが見られる状態を保つ
  robots: { index: false, follow: false, nocache: true },
  // 本文中の URL を踏まれたときに共有リンク自体が Referer で外部へ渡らないようにする
  referrer: "no-referrer",
};

/**
 * 共有の停止を即座に効かせるため、キャッシュせず毎回引き直す。
 * 停止したのにしばらく見えるのは、この機能では最も避けたい壊れ方。
 */
export const dynamic = "force-dynamic";

export default async function SharedPromptPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const prompt = await getSharedPrompt(token);

  // 存在しない / 停止済み / ゴミ箱行き はすべて 404。区別を返さない
  if (!prompt) notFound();

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8">
      <p className="mb-3 text-xs text-[var(--muted)]">共有されたプロンプト</p>

      <article className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-5">
        {prompt.title ? (
          <h1 className="text-lg font-medium break-words">{prompt.title}</h1>
        ) : null}

        {prompt.body ? (
          // 本文は必ずプレーンテキストとして出す。Markdown/HTML として解釈しない
          // （公開ページなので、書き手の入力がそのまま第三者のブラウザで動くのは避ける）
          <p
            className={`text-sm whitespace-pre-wrap break-words text-[var(--muted-strong)] ${
              prompt.title ? "mt-3" : ""
            }`}
          >
            {prompt.body}
          </p>
        ) : null}

        {prompt.tags.length > 0 ? (
          <ul className="mt-4 flex flex-wrap gap-1">
            {prompt.tags.map((tag) => (
              <li
                key={tag}
                className="rounded-full bg-[var(--chip)] px-2 py-0.5 text-[11px] text-[var(--muted-strong)]"
              >
                {tag}
              </li>
            ))}
          </ul>
        ) : null}

        <div className="mt-5 flex items-center justify-between gap-3 border-t border-[var(--border)] pt-4">
          <CopyButton
            text={prompt.body}
            className="rounded-md bg-[var(--foreground)] px-4 py-2 text-sm font-medium text-[var(--card)]"
          />
          <span className="text-xs text-[var(--muted)]">
            最終更新 {new Date(prompt.updated_at).toLocaleDateString("ja-JP")}
          </span>
        </div>
      </article>

      <p className="mt-6 text-center text-xs text-[var(--muted)]">
        <Link href="/" className="hover:underline">
          prompt-keep
        </Link>{" "}
        で共有されました
      </p>
    </div>
  );
}
