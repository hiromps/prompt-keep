import Link from "next/link";
import { firstParam } from "@/lib/url";

export const metadata = { title: "認証エラー" };

/**
 * Auth.js の error ページ（auth 設定の pages.error で指定）。
 * ここに来るのは kind="error" のエラーのみ。サインイン系エラー
 * （OAuthAccountNotLinked 等）は /signin?error= に飛ぶ点に注意。
 */
const ERROR_MESSAGES: Record<string, string> = {
  Configuration:
    "認証処理でエラーが発生しました。時間をおいて再試行してください。解決しない場合は管理者にお問い合わせください。",
  AccessDenied:
    "アクセスが拒否されました。アカウントが停止されている可能性があります。心当たりがない場合は管理者にお問い合わせください。",
  Verification: "認証リンクが無効か、期限切れです。",
  Default: "認証中にエラーが発生しました。もう一度お試しください。",
};

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string | string[] }>;
}) {
  const params = await searchParams;
  const error = firstParam(params.error);
  const message = ERROR_MESSAGES[error ?? "Default"] ?? ERROR_MESSAGES.Default;

  return (
    <div className="mx-auto max-w-sm py-16 text-center">
      <h1 className="text-2xl font-bold">認証エラー</h1>
      <p className="mt-4 text-sm text-zinc-600">{message}</p>
      <Link
        href="/signin"
        className="mt-8 inline-block rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white"
      >
        ログインへ戻る
      </Link>
    </div>
  );
}
