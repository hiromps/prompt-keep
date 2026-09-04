import { requirePageUser } from "@/auth/guards";
import { listPromptsByOwner } from "@/features/prompts/queries";
import { PromptsShell } from "@/features/prompts/components/prompts-shell";
import { tagCounts, viewOf } from "@/features/prompts/model";

export const metadata = { title: "アーカイブ" };

export default async function ArchivedPromptsPage() {
  const user = await requirePageUser("/prompts/archive");
  const all = await listPromptsByOwner(user.id);

  return (
    <PromptsShell
      view="archived"
      prompts={all.filter((prompt) => viewOf(prompt) === "archived")}
      tags={tagCounts(all.filter((prompt) => viewOf(prompt) === "active"))}
    />
  );
}
