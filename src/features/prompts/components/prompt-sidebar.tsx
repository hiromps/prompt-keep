"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Lightbulb, Archive, Trash2, Tag, X } from "lucide-react";
import { useAppShell } from "@/components/app-shell";
import type { PromptView, TagCount } from "@/features/prompts/model";

const NAV = [
  { view: "active" as const, href: "/prompts", label: "プロンプト", Icon: Lightbulb },
  { view: "archived" as const, href: "/prompts/archive", label: "アーカイブ", Icon: Archive },
  { view: "trashed" as const, href: "/prompts/trash", label: "ゴミ箱", Icon: Trash2 },
];

type Props = { view: PromptView; tags: TagCount[]; activeTag?: string };

/**
 * サイドバー。画面幅で見せ方が変わる。
 * - md 以上: 画面左端に常設。ハンバーガーで「幅広 ↔ アイコンだけのレール」を切り替える
 * - md 未満: 画面に覆いかぶさるドロワー。ハンバーガーで開き、選択・背景・Esc で閉じる
 *
 * タグは「プロンプト」の下の階層として扱う（タグが付くのは通常ビューの行だけで、
 * クリック先も /prompts?tag=… になるため）。レールが畳まれているときも到達できるよう、
 * プロンプトのアイコンにホバー / フォーカスするとタグ一覧がせり出す。
 */
export function PromptSidebar(props: Props) {
  return (
    <>
      <DesktopRail {...props} />
      <MobileDrawer {...props} />
    </>
  );
}

const ROW_BASE = "flex items-center overflow-hidden text-sm whitespace-nowrap";

function rowState(active: boolean) {
  return active
    ? "bg-[var(--chip-active)] font-medium"
    : "text-[var(--muted-strong)] hover:bg-[var(--chip)]";
}

function navRowClass(active: boolean, expanded: boolean) {
  const shape = expanded
    ? "gap-4 rounded-r-full px-6 py-2.5"
    : // 畳んだレールでは、アイコンを囲む円をハイライトにする
      "mx-3 justify-center rounded-full p-3";
  return [ROW_BASE, shape, rowState(active)].join(" ");
}

function tagRowClass(active: boolean, nested: boolean) {
  const indent = nested ? "pr-4 pl-14" : "px-4";
  return [ROW_BASE, "gap-3 rounded-r-full py-2", indent, rowState(active)].join(" ");
}

function TagItems({
  tags,
  activeTag,
  nested,
  onSelect,
}: {
  tags: TagCount[];
  activeTag?: string;
  nested: boolean;
  /** 項目を選んだとき（ドロワーを閉じる用） */
  onSelect?: () => void;
}) {
  const pathname = usePathname();

  /**
   * 通常ビューの中でのタグ切り替えは、URL を書き換えるだけで済む。
   * 全件は prompts/layout.tsx が持っていて、絞り込みは PromptsWorkspace が
   * useSearchParams から行うため。pushState は Next.js の router と同期して
   * useSearchParams / usePathname を更新するので、サーバー往復は一切起きない。
   * アーカイブ / ゴミ箱からは通常の遷移に任せる（page セグメントだけ取りに行く）。
   * href はそのまま残すので、新しいタブで開く・修飾キー付きクリックは普通のリンクとして動く。
   */
  const switchTag = (href: string) => (event: { preventDefault: () => void }) => {
    if (pathname !== "/prompts") return;
    event.preventDefault();
    window.history.pushState(null, "", href);
    onSelect?.();
  };

  return (
    <>
      {activeTag ? (
        <li>
          <Link
            href="/prompts"
            onNavigate={switchTag("/prompts")}
            onClick={onSelect}
            className={tagRowClass(false, nested)}
          >
            <Tag className="size-4 shrink-0" aria-hidden="true" />
            <span className="flex-1 truncate">すべて</span>
          </Link>
        </li>
      ) : null}
      {tags.map(({ tag, count }) => {
        const href = `/prompts?tag=${encodeURIComponent(tag)}`;
        return (
          <li key={tag}>
            <Link
              href={href}
              onNavigate={switchTag(href)}
              onClick={onSelect}
              aria-current={tag === activeTag ? "page" : undefined}
              className={tagRowClass(tag === activeTag, nested)}
            >
              <Tag className="size-4 shrink-0" aria-hidden="true" />
              <span className="flex-1 truncate">{tag}</span>
              <span className="text-xs text-[var(--muted)]">{count}</span>
            </Link>
          </li>
        );
      })}
    </>
  );
}

function DesktopRail({ view, tags, activeTag }: Props) {
  const { railExpanded } = useAppShell();

  const width = railExpanded
    ? "w-72 overflow-x-hidden overflow-y-auto"
    : // 畳んでいるときはフライアウトがはみ出す必要があるので切り取らない
      "w-[72px] overflow-visible";

  return (
    <nav
      aria-label="プロンプトの絞り込み"
      className={`sticky top-[53px] hidden shrink-0 self-start py-2 transition-[width] duration-200 md:block ${width}`}
      style={railExpanded ? { maxHeight: "calc(100vh - 53px)" } : undefined}
    >
      <ul>
        {NAV.map(({ view: v, href, label, Icon }) => {
          const ownsTags = v === "active" && tags.length > 0;
          return (
            <li key={href} className={!railExpanded && ownsTags ? "group/nav relative" : undefined}>
              <Link
                href={href}
                prefetch={v === view ? false : true}
                aria-current={v === view ? "page" : undefined}
                title={railExpanded ? undefined : label}
                className={navRowClass(v === view, railExpanded)}
              >
                <Icon className="size-5 shrink-0" aria-hidden="true" />
                <span className={railExpanded ? "" : "sr-only"}>{label}</span>
              </Link>

              {ownsTags ? (
                railExpanded ? (
                  <div className="mt-1 mb-2">
                    <p className="px-6 py-1 text-xs font-medium text-[var(--muted)]">タグ</p>
                    <ul>
                      <TagItems tags={tags} activeTag={activeTag} nested />
                    </ul>
                  </div>
                ) : (
                  <div className="invisible absolute top-0 left-full z-40 ml-1 opacity-0 transition-opacity group-focus-within/nav:visible group-focus-within/nav:opacity-100 group-hover/nav:visible group-hover/nav:opacity-100">
                    <div className="max-h-[70vh] w-56 overflow-y-auto rounded-lg border border-[var(--border)] bg-[var(--card)] py-2 shadow-lg">
                      <p className="px-4 py-1 text-xs font-medium text-[var(--muted)]">タグ</p>
                      <ul>
                        <TagItems tags={tags} activeTag={activeTag} nested={false} />
                      </ul>
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

function MobileDrawer({ view, tags, activeTag }: Props) {
  const { drawerOpen, setDrawerOpen } = useAppShell();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // 行き先が変わったら閉じる。onClick だけに頼ると、ブラウザの戻る操作などで開いたまま残る
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname, searchParams, setDrawerOpen]);

  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDrawerOpen(false);
    };
    // 開いている間は背後をスクロールさせない
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKey);
    };
  }, [drawerOpen, setDrawerOpen]);

  const close = () => setDrawerOpen(false);

  return (
    <div className="md:hidden">
      <div
        onClick={close}
        aria-hidden="true"
        className={`fixed inset-0 z-40 bg-black/50 transition-opacity duration-200 ${
          drawerOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />
      <nav
        id="prompt-drawer"
        aria-label="プロンプトの絞り込み"
        aria-hidden={!drawerOpen}
        className={`fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] overflow-y-auto bg-[var(--background)] py-2 shadow-xl transition-transform duration-200 ${
          drawerOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="mb-2 flex items-center justify-between pr-2 pl-5">
          <span className="font-semibold">prompt-keep</span>
          <button
            type="button"
            onClick={close}
            aria-label="メニューを閉じる"
            tabIndex={drawerOpen ? undefined : -1}
            className="rounded-full p-2 text-[var(--muted-strong)] hover:bg-[var(--chip)]"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>
        <ul>
          {NAV.map(({ view: v, href, label, Icon }) => (
            <li key={href}>
              <Link
                href={href}
                prefetch={v === view ? false : true}
                onClick={close}
                tabIndex={drawerOpen ? undefined : -1}
                aria-current={v === view ? "page" : undefined}
                className={navRowClass(v === view, true)}
              >
                <Icon className="size-5 shrink-0" aria-hidden="true" />
                <span>{label}</span>
              </Link>
              {v === "active" && tags.length > 0 ? (
                <div className="mt-1 mb-2">
                  <p className="px-4 py-1 text-xs font-medium text-[var(--muted)]">タグ</p>
                  <ul>
                    {/* 幅の狭いドロワーでは字下げしない。タグ名の前が空くと読みにくい */}
                    <TagItems tags={tags} activeTag={activeTag} nested={false} onSelect={close} />
                  </ul>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
