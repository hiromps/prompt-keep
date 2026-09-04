import { PromptComposer } from "@/features/prompts/components/prompt-composer";
import { PromptBoard } from "@/features/prompts/components/prompt-board";
import { PromptSidebar } from "@/features/prompts/components/prompt-sidebar";
import { PromptsAutoRefresh } from "@/features/prompts/components/prompts-auto-refresh";
import type { Prompt, PromptView, TagCount } from "@/features/prompts/model";

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
        <PromptBoard prompts={prompts} view={view} />
      </div>
    </div>
  );
}
