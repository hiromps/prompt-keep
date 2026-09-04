"use client";

import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { useAppShell } from "@/components/app-shell";

/**
 * サイドバーを開閉するハンバーガー。プロンプト一覧系のパスでのみ表示する。
 *
 * 画面幅で対象が違う（md 未満はドロワー、md 以上は常設レール）ので、
 * ボタンを2つ置いて CSS で出し分ける。JS で画面幅を判定すると、
 * サーバーで描いた HTML と初回描画がずれてハイドレーションが警告を出す。
 */
export function SidebarToggle() {
  const pathname = usePathname();
  const { railExpanded, toggleRail, drawerOpen, setDrawerOpen } = useAppShell();

  if (!pathname.startsWith("/prompts")) return null;

  const cls = "shrink-0 rounded-full p-2 text-[var(--muted-strong)] hover:bg-[var(--chip)]";

  return (
    <>
      <button
        type="button"
        onClick={() => setDrawerOpen(!drawerOpen)}
        aria-label={drawerOpen ? "メニューを閉じる" : "メニューを開く"}
        aria-expanded={drawerOpen}
        aria-controls="prompt-drawer"
        className={`${cls} md:hidden`}
      >
        <Menu className="size-5" aria-hidden="true" />
      </button>
      <button
        type="button"
        onClick={toggleRail}
        aria-label={railExpanded ? "サイドバーを閉じる" : "サイドバーを開く"}
        aria-expanded={railExpanded}
        className={`${cls} hidden md:block`}
      >
        <Menu className="size-5" aria-hidden="true" />
      </button>
    </>
  );
}
