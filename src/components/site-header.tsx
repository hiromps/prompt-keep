import Link from "next/link";
import { projectConfig } from "@config";
import { getSessionUser } from "@/auth/guards";
import { signOut } from "@/auth";
import { SidebarToggle } from "@/components/sidebar-toggle";
import { HeaderSearch } from "@/components/header-search";

export async function SiteHeader() {
  const user = await getSessionUser();

  return (
    <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-[var(--background)]">
      <div className="flex items-center gap-3 px-3 py-2">
        {/* ハンバーガーと検索はプロンプト一覧でのみ出る（内部で pathname を見て自分で消える） */}
        <SidebarToggle />
        <Link href="/" className="shrink-0 px-1 font-semibold whitespace-nowrap">
          prompt-keep
        </Link>
        <div className="hidden min-w-0 flex-1 md:flex md:max-w-2xl">
          <HeaderSearch />
        </div>
        <nav className="ml-auto flex shrink-0 items-center gap-3 text-sm">
          {user ? (
            <>
              <Link href="/prompts" className="hidden hover:underline sm:inline">
                プロンプト
              </Link>
              <Link href="/profile" className="hidden hover:underline sm:inline">
                プロフィール
              </Link>
              {user.role === "admin" && projectConfig.modules.admin ? (
                <Link href="/admin" className="hidden hover:underline sm:inline">
                  管理
                </Link>
              ) : null}
              <form
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/" });
                }}
              >
                <button
                  type="submit"
                  className="rounded-md border border-[var(--border)] px-3 py-1.5 whitespace-nowrap"
                >
                  ログアウト
                </button>
              </form>
            </>
          ) : (
            <Link
              href="/signin"
              className="rounded-md bg-[var(--foreground)] px-3 py-1.5 font-medium text-[var(--card)]"
            >
              ログイン
            </Link>
          )}
        </nav>
      </div>
      {/* 画面が狭いときは検索を2段目へ回す（サイト名と並べるには幅が足りないため） */}
      <div className="px-3 pb-2 md:hidden">
        <HeaderSearch />
      </div>
    </header>
  );
}
