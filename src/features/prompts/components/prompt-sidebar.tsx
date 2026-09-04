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
 * タグは「プロンプト」の下の階層として扱う（タグが付くのは通常ビューの行だけで、
 * クリック先も /prompts?tag=… になるため）。畳んでいるときも到達できるよう、
 * プロンプトのアイコンにホバー / フォーカスするとタグ一覧がせり出す。
 *
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

  const rowBase = "flex items-center overflow-hidden text-sm whitespace-nowrap";
  const rowState = (active: boolean) =>
    active
      ? "bg-[var(--chip-active)] font-medium"
      : "text-[var(--muted-strong)] hover:bg-[var(--chip)]";

  const navRow = (active: boolean) =>
    `${rowBase} ${
      sidebarOpen
        ? "gap-4 rounded-r-full px-6 py-2.5"
        : // 畳んだレールでは、アイコンを囲む円をハイライトにする
          "mx-3 justify-center rounded-full p-3"
    } ${rowState(active)}`;

  /** タグ1件の行。開いているときは「プロンプト」より深くインデントする。 */
  const tagRow = (active: boolean, nested: boolean) =>
    `${rowBase} gap-3 rounded-r-full py-2 ${nested ? "pr-4 pl-14" : "px-4"} ${rowState(active)}`;

  const tagItems = (nested: boolean) => (
    <>
      {activeTag ? (
        <li>
          <Link href="/prompts" className={tagRow(false, nested)}>
            <Tag className="size-4 shrink-0" aria-hidden="true" />
            <span className="flex-1 truncate">すべて</span>
          </Link>
        </li>
      ) : null}
      {tags.map(({ tag, count }) => (
        <li key={tag}>
          <Link
            href={`/prompts?tag=${encodeURIComponent(tag)}`}
            aria-current={tag === activeTag ? "page" : undefined}
            className={tagRow(tag === activeTag, nested)}
          >
            <Tag className="size-4 shrink-0" aria-hidden="true" />
            <span className="flex-1 truncate">{tag}</span>
            <span className="text-xs text-[var(--muted)]">{count}</span>
          </Link>
        </li>
      ))}
    </>
  );

  return (
    <nav
      aria-label="プロンプトの絞り込み"
      className={`sticky top-[53px] hidden shrink-0 self-start py-2 transition-[width] duration-200 md:block ${
        sidebarOpen
          ? "w-72 overflow-x-hidden overflow-y-auto"
          : // 畳んでいるときはフライアウトがはみ出す必要があるので切り取らない
            "w-[72px] overflow-visible"
      }`}
      style={sidebarOpen ? { maxHeight: "calc(100vh - 53px)" } : undefined}
    >
      <ul>
        {NAV.map(({ view: v, href, label, Icon }) => {
          const ownsTags = v === "active" && tags.length > 0;
          return (
            <li key={href} className={!sidebarOpen && ownsTags ? "group/nav relative" : undefined}>
              <Link
                href={href}
                aria-current={v === view ? "page" : undefined}
                title={sidebarOpen ? undefined : label}
                className={navRow(v === view)}
              >
                <Icon className="size-5 shrink-0" aria-hidden="true" />
                {/* 畳んでいるときもラベルは DOM に残し、読み上げには届くようにする */}
                <span className={sidebarOpen ? "" : "sr-only"}>{label}</span>
              </Link>

              {ownsTags ? (
                sidebarOpen ? (
                  <div className="mt-1 mb-2">
                    <p className="px-6 py-1 text-xs font-medium text-[var(--muted)]">タグ</p>
                    <ul>{tagItems(true)}</ul>
                  </div>
                ) : (
                  // 畳んでいるとき: アイコンにホバー / キーボードフォーカスで出す。
                  // このレールは md 以上でしか出さないので、ホバーが使えない環境は考えない。
                  <div className="invisible absolute top-0 left-full z-40 ml-1 opacity-0 transition-opacity group-focus-within/nav:visible group-focus-within/nav:opacity-100 group-hover/nav:visible group-hover/nav:opacity-100">
                    <div className="max-h-[70vh] w-56 overflow-y-auto rounded-lg border border-[var(--border)] bg-[var(--card)] py-2 shadow-lg">
                      <p className="px-4 py-1 text-xs font-medium text-[var(--muted)]">タグ</p>
                      <ul>{tagItems(false)}</ul>
                    </div>
                  </div>
                )
              ) : null}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
