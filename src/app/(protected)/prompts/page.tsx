import { requirePageUser } from "@/auth/guards";
import { listPromptsByOwner } from "@/features/prompts/queries";
import { PromptsShell } from "@/features/prompts/components/prompts-shell";
import { hasTag, tagCounts, viewOf } from "@/features/prompts/model";
import { firstParam } from "@/lib/url";

export const metadata = { title: "プロンプト" };

/**
 * 通常ビュー。?tag= があればそのタグのみに絞る。
 * Next.js 16 では searchParams が Promise なので await が要る。
 */
export default async function PromptsPage({
  searchParams,
}: {
  searchParams: Promise<{ tag?: string | string[] }>;
}) {
  const user = await requirePageUser("/prompts");
  const all = await listPromptsByOwner(user.id);
  const active = all.filter((prompt) => viewOf(prompt) === "active");

  const tag = firstParam((await searchParams).tag);
  const prompts = tag ? active.filter((prompt) => hasTag(prompt, tag)) : active;

  return (
    <PromptsShell
      view="active"
      prompts={prompts}
      tags={tagCounts(active)}
      activeTag={tag}
    />
  );
}
