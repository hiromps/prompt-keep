import Link from "next/link";
import { projectConfig } from "@config";
import { getSessionUser } from "@/auth/guards";
import { signOut } from "@/auth";

export async function SiteHeader() {
  const user = await getSessionUser();

  return (
    <header className="border-b border-zinc-200">
      <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
        <Link href="/" className="font-semibold">
          MVP Starter
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          {user ? (
            <>
              <Link href="/dashboard" className="hover:underline">
                ダッシュボード
              </Link>
              <Link href="/profile" className="hover:underline">
                プロフィール
              </Link>
              {user.role === "admin" && projectConfig.modules.admin ? (
                <Link href="/admin" className="hover:underline">
                  管理
                </Link>
              ) : null}
              <form
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/" });
                }}
              >
                <button type="submit" className="rounded-md border border-zinc-300 px-3 py-1.5">
                  ログアウト
                </button>
              </form>
            </>
          ) : (
            <Link
              href="/signin"
              className="rounded-md bg-zinc-900 px-3 py-1.5 font-medium text-white"
            >
              ログイン
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
