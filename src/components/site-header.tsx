import Link from "next/link";
import { projectConfig } from "@config";
import { getSessionUser } from "@/auth/guards";
import { SidebarToggle } from "@/components/sidebar-toggle";
import { HeaderSearch } from "@/components/header-search";
import { UserAvatar } from "@/components/user-avatar";

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
              {/* ログアウトはサイドバーの一番下（プロンプト画面）とプロフィール画面にある。
                  右上は「誰でログインしているか」を示すアバターで、押すとプロフィールへ */}
              <Link
                href="/profile"
                aria-label={`${user.name || user.email || "アカウント"}（プロフィール）`}
                title={user.name || user.email || undefined}
                className="shrink-0 rounded-full ring-[var(--border)] ring-offset-2 hover:ring-2"
              >
                <UserAvatar image={user.image} name={user.name} email={user.email} />
              </Link>
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
