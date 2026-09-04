"use client";

import Link from "next/link";
import { Lightbulb, Archive, Trash2, Tag } from "lucide-react";
import { useAppShell } from "@/components/app-shell";
import type { PromptView, TagCount } from "@/features/prompts/model";

const NAV = [
  { view: "active" as const, href: "/prompts", label: "プロンプト", Icon: Lightbulb },
  { view: "archived" as const, href: "/prompts/archive", label: "アーカイブ", Icon: Archive },
  { view: "trashed" as const, href: "/prompts/trash", label: "ゴミ箱", Icon: Trash2 },
];

/**
 * 画面左端に貼り付くサイドバー。ヘッダーのハンバーガーで開閉する。
 *
 * 閉じているときはアイコンだけの細いレール（Google Keep と同じ挙動）。
 * 開閉状態はヘッダー側のボタンが持つので AppShell のコンテキストから読む。
 * 幅の切り替えは display の出し分けではなく width のトランジションで行う
 * （消えるのではなく縮むので、どこに何があったか分からなくならない）。
 */
export function PromptSidebar({
  view,
  tags,
  activeTag,
}: {
  view: PromptView;
  tags: TagCount[];
  activeTag?: string;
}) {
  const { sidebarOpen } = useAppShell();

  const item = (active: boolean) =>
    `flex items-center overflow-hidden text-sm whitespace-nowrap ${
      sidebarOpen
        ? "gap-4 rounded-r-full px-6 py-2.5"
        : // 畳んだレールでは、アイコンを囲む円をハイライトにする
          "mx-3 justify-center rounded-full p-3"
    } ${
      active
        ? "bg-[var(--chip-active)] font-medium"
        : "text-[var(--muted-strong)] hover:bg-[var(--chip)]"
    }`;

  return (
    <nav
      aria-label="プロンプトの絞り込み"
      className={`sticky top-[53px] hidden shrink-0 self-start overflow-x-hidden overflow-y-auto border-r border-transparent py-2 transition-[width] duration-200 md:block ${
        sidebarOpen ? "w-72" : "w-[72px]"
      }`}
      style={{ maxHeight: "calc(100vh - 53px)" }}
    >
      <ul>
        {NAV.map(({ view: v, href, label, Icon }) => (
          <li key={href}>
            <Link
              href={href}
              aria-current={v === view ? "page" : undefined}
              title={sidebarOpen ? undefined : label}
              className={item(v === view)}
            >
              <Icon className="size-5 shrink-0" aria-hidden="true" />
              {/* 閉じているときもラベルは DOM に残し、幅0で隠す。
                  条件分岐で消すとレールの高さが揺れて開閉がガタつく */}
              <span className={sidebarOpen ? "" : "sr-only"}>{label}</span>
            </Link>
          </li>
        ))}
      </ul>

      {view === "active" && tags.length > 0 && sidebarOpen ? (
        <div className="mt-4">
          <p className="px-6 text-xs font-medium text-[var(--muted)]">タグ</p>
          <ul className="mt-1">
            {activeTag ? (
              <li>
                <Link href="/prompts" className={item(false)}>
                  <Tag className="size-5 shrink-0" aria-hidden="true" />
                  <span>すべて</span>
                </Link>
              </li>
            ) : null}
            {tags.map(({ tag, count }) => (
              <li key={tag}>
                <Link
                  href={`/prompts?tag=${encodeURIComponent(tag)}`}
                  aria-current={tag === activeTag ? "page" : undefined}
                  className={item(tag === activeTag)}
                >
                  <Tag className="size-5 shrink-0" aria-hidden="true" />
                  <span className="flex-1 truncate">{tag}</span>
                  <span className="text-xs text-[var(--muted)]">{count}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </nav>
  );
}
