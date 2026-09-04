"use client";

import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { useAppShell } from "@/components/app-shell";

/** サイドバーを開閉するハンバーガー。プロンプト一覧系のパスでのみ表示する。 */
export function SidebarToggle() {
  const pathname = usePathname();
  const { sidebarOpen, toggleSidebar } = useAppShell();

  if (!pathname.startsWith("/prompts")) return null;

  return (
    <button
      type="button"
      onClick={toggleSidebar}
      aria-label={sidebarOpen ? "サイドバーを閉じる" : "サイドバーを開く"}
      aria-expanded={sidebarOpen}
      // サイドバーは md 以上でしか出さないので、それ未満では押しても何も起きない
      className="hidden shrink-0 rounded-full p-2 text-[var(--muted-strong)] hover:bg-[var(--chip)] md:block"
    >
      <Menu className="size-5" aria-hidden="true" />
    </button>
  );
}
