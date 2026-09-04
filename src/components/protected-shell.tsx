import { PromptSidebar } from "@/features/prompts/components/prompt-sidebar";

/**
 * プロンプト画面以外のログイン後画面（プロフィール / 管理）の外枠。
 *
 * ヘッダーのハンバーガーが開くサイドバーを、プロンプト画面と同じ見た目で出す。
 * タグ一覧は持たないので、3ビューへのリンクとログアウトだけが並ぶ。
 * 本体は残りの幅を使い、各ページが自分でコンテナ（max-width）を持つ。
 */
export function ProtectedShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex w-full flex-1 items-stretch">
      <PromptSidebar />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
