import { requireSessionForPage } from "@/auth/guards";

export const metadata = { title: "ゴミ箱" };

/**
 * ゴミ箱。描画は layout.tsx 側の PromptsWorkspace（prompts/page.tsx 参照）。
 * 自動削除の仕組み（cron 等）はこのスタックに無いため、
 * 手動で「完全に削除」するまで残り続ける。
 */
export default async function TrashedPromptsPage() {
  await requireSessionForPage("/prompts/trash");
  return null;
}
