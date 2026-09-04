"use client";

import { useMemo } from "react";
import { useSearchParams, useSelectedLayoutSegment } from "next/navigation";
import { PromptComposer } from "@/features/prompts/components/prompt-composer";
import { PromptBoard } from "@/features/prompts/components/prompt-board";
import { PromptSidebar } from "@/features/prompts/components/prompt-sidebar";
import { PromptsAutoRefresh } from "@/features/prompts/components/prompts-auto-refresh";
import { hasTag, tagCounts, viewOf, type Prompt, type PromptView } from "@/features/prompts/model";

/** prompts/layout.tsx の1つ下のセグメント → ビュー。null（= /prompts）は通常ビュー */
const VIEW_BY_SEGMENT: Record<string, PromptView> = {
  archive: "archived",
  trash: "trashed",
};

/**
 * プロンプト画面の外枠（サイドバー + クイック入力 + 盤面）。
 *
 * データは prompts/layout.tsx が所有者の全行を1回取得して渡す。どのビューを見せるかと
 * タグの絞り込みは、サーバーではなくここが URL から決める。
 * こうしておくと、通常 ↔ アーカイブ ↔ ゴミ箱 の切り替えやタグ絞り込みで
 * サーバーに戻らない（レイアウトはクライアント遷移で再描画されない）。
 *
 * ビューごとに DB を叩き分けないのは、サイドバーのタグ件数とクライアント検索が
 * 常に全件を前提にできるようにするため（ビューごとに絞ると、アーカイブ画面でタグ件数がずれる）。
 */
export function PromptsWorkspace({
  prompts,
  children,
}: {
  prompts: Prompt[];
  /** 各 page.tsx の描画結果（null）。ツリーの整合のために内側へ置く */
  children: React.ReactNode;
}) {
  const segment = useSelectedLayoutSegment();
  const view: PromptView = (segment && VIEW_BY_SEGMENT[segment]) || "active";

  // タグが付くのは通常ビューの行だけなので、絞り込みも通常ビューでのみ効かせる
  const searchParams = useSearchParams();
  const activeTag = view === "active" ? searchParams.get("tag") || undefined : undefined;

  const byView = useMemo(() => {
    const groups: Record<PromptView, Prompt[]> = { active: [], archived: [], trashed: [] };
    for (const prompt of prompts) groups[viewOf(prompt)].push(prompt);
    return groups;
  }, [prompts]);

  const tags = useMemo(() => tagCounts(byView.active), [byView]);

  const visible = useMemo(
    () => (activeTag ? byView[view].filter((p) => hasTag(p, activeTag)) : byView[view]),
    [byView, view, activeTag],
  );

  return (
    // 画面の左端からサイドバーを始めるため、ここでは中央寄せしない
    <div className="flex w-full flex-1 items-stretch">
      {/* 他の端末での追加・編集をリロードなしで拾う */}
      <PromptsAutoRefresh />
      <PromptSidebar view={view} tags={tags} activeTag={activeTag} />

      <div className="min-w-0 flex-1 px-4 py-4">
        {view === "active" ? (
          <div className="mx-auto mb-6 max-w-xl">
            <PromptComposer />
          </div>
        ) : null}
        <PromptBoard prompts={visible} view={view} />
        {children}
      </div>
    </div>
  );
}
