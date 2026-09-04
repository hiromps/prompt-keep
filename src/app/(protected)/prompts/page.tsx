import { requireSessionForPage } from "@/auth/guards";

export const metadata = { title: "プロンプト" };

/**
 * 通常ビュー。描画は layout.tsx 側の PromptsWorkspace が行い、?tag= もそこで読む。
 * このページは URL を存在させ、未ログイン時に正確な callbackUrl で /signin へ飛ばすためにある。
 */
export default async function PromptsPage() {
  await requireSessionForPage("/prompts");
  return null;
}
