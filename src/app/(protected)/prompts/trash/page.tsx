import { requirePageUser } from "@/auth/guards";
import { listPromptsByOwner } from "@/features/prompts/queries";
import { PromptsShell } from "@/features/prompts/components/prompts-shell";
import { tagCounts, viewOf } from "@/features/prompts/model";

export const metadata = { title: "ゴミ箱" };

/**
 * ゴミ箱。自動削除の仕組み（cron 等）はこのスタックに無いため、
 * 手動で「完全に削除」するまで残り続ける。
 */
export default async function TrashedPromptsPage() {
  const user = await requirePageUser("/prompts/trash");
  const all = await listPromptsByOwner(user.id);

  return (
    <PromptsShell
      view="trashed"
      prompts={all.filter((prompt) => viewOf(prompt) === "trashed")}
      tags={tagCounts(all.filter((prompt) => viewOf(prompt) === "active"))}
    />
  );
}
