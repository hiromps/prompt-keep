import Link from "next/link";
import { PromptComposer } from "@/features/prompts/components/prompt-composer";
import { PromptBoard } from "@/features/prompts/components/prompt-board";
import type { Prompt, PromptView, TagCount } from "@/features/prompts/model";

const NAV: { view: PromptView; href: string; label: string }[] = [
  { view: "active", href: "/prompts", label: "プロンプト" },
  { view: "archived", href: "/prompts/archive", label: "アーカイブ" },
  { view: "trashed", href: "/prompts/trash", label: "ゴミ箱" },
];

/**
 * 3ビュー共通の外枠（サイドバー + 盤面）。
 *
 * データ取得は必ず各ページ側で行い、ここでは受け取るだけにする。
 * App Router は兄弟ページ間の遷移で layout を再レンダリングしないため、
 * layout でタグ一覧を取ると更新後に古いまま残る。
 */
export function PromptsShell({
  view,
  prompts,
  tags,
  activeTag,
}: {
  view: PromptView;
  prompts: Prompt[];
  tags: TagCount[];
  activeTag?: string;
}) {
  return (
    <div className="flex flex-col gap-6 md:flex-row">
      <nav className="shrink-0 md:w-56" aria-label="プロンプトの絞り込み">
        <ul className="flex gap-1 overflow-x-auto md:flex-col md:overflow-visible">
          {NAV.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={item.view === view ? "page" : undefined}
                className={`block rounded-full px-4 py-2 text-sm whitespace-nowrap md:rounded-r-full md:rounded-l-none ${
                  item.view === view
                    ? "bg-[var(--chip-active)] font-medium"
                    : "text-[var(--muted-strong)] hover:bg-[var(--chip)]"
                }`}
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>

        {view === "active" && tags.length > 0 ? (
          <div className="mt-4">
            <p className="px-4 text-xs font-medium text-[var(--muted)]">タグ</p>
            <ul className="mt-1 flex gap-1 overflow-x-auto md:flex-col md:overflow-visible">
              {activeTag ? (
                <li>
                  <Link
                    href="/prompts"
                    className="block rounded-full px-4 py-1.5 text-sm whitespace-nowrap text-[var(--muted-strong)] hover:bg-[var(--chip)] md:rounded-r-full md:rounded-l-none"
                  >
                    ← すべて
                  </Link>
                </li>
              ) : null}
              {tags.map(({ tag, count }) => (
                <li key={tag}>
                  <Link
                    href={`/prompts?tag=${encodeURIComponent(tag)}`}
                    aria-current={tag === activeTag ? "page" : undefined}
                    className={`block rounded-full px-4 py-1.5 text-sm whitespace-nowrap md:rounded-r-full md:rounded-l-none ${
                      tag === activeTag
                        ? "bg-[var(--chip-active)] font-medium"
                        : "text-[var(--muted-strong)] hover:bg-[var(--chip)]"
                    }`}
                  >
                    {tag}
                    <span className="ml-1.5 text-xs text-[var(--muted)]">{count}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </nav>

      <div className="min-w-0 flex-1">
        {view === "active" ? (
          <div className="mx-auto mb-6 max-w-xl">
            <PromptComposer />
          </div>
        ) : null}
        <PromptBoard prompts={prompts} view={view} />
      </div>
    </div>
  );
}
