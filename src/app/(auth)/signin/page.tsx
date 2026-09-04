import { redirect } from "next/navigation";
import { signIn } from "@/auth";
import { getSessionUser } from "@/auth/guards";
import { firstParam, safeInternalPath } from "@/lib/url";

export const metadata = { title: "ログイン" };

/**
 * サインイン系エラー（SignInError.kind = "signIn"）は Auth.js により
 * pages.error ではなく、このページへ ?error= 付きでリダイレクトされる。
 */
const SIGNIN_ERROR_MESSAGES: Record<string, string> = {
  OAuthAccountNotLinked:
    "このメールアドレスは別のログイン方法で登録されています。以前と同じ方法でログインしてください。",
  OAuthCallbackError: "Googleとの連携中にエラーが発生しました。もう一度お試しください。",
  OAuthSignInError: "Googleへの接続に失敗しました。もう一度お試しください。",
  Default: "ログインに失敗しました。もう一度お試しください。",
};

/**
 * サインイン画面。ログイン済みならダッシュボードへ。
 * callbackUrl は同一オリジンの相対パスのみ許可する（オープンリダイレクト防止）。
 * searchParams は同名クエリが複数あると string[] になるため firstParam で正規化する。
 */
export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string | string[]; error?: string | string[] }>;
}) {
  const user = await getSessionUser();
  if (user) redirect("/dashboard");

  const params = await searchParams;
  const redirectTo = safeInternalPath(firstParam(params.callbackUrl)) ?? "/dashboard";
  const errorType = firstParam(params.error);
  const errorMessage = errorType
    ? (SIGNIN_ERROR_MESSAGES[errorType] ?? SIGNIN_ERROR_MESSAGES.Default)
    : null;

  return (
    <div className="mx-auto max-w-sm py-16 text-center">
      <h1 className="text-2xl font-bold">ログイン</h1>
      <p className="mt-2 text-sm text-zinc-600">
        Googleアカウントでログインしてください。
      </p>
      {errorMessage ? (
        <p
          role="alert"
          className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {errorMessage}
        </p>
      ) : null}
      <form
        className="mt-8"
        action={async () => {
          "use server";
          await signIn("google", { redirectTo });
        }}
      >
        <button
          type="submit"
          className="w-full rounded-md bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white"
        >
          Googleでログイン
        </button>
      </form>
    </div>
  );
}
