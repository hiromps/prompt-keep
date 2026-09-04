import { requireSessionForPage } from "@/auth/guards";

export const metadata = { title: "アーカイブ" };

/** アーカイブ。描画は layout.tsx 側の PromptsWorkspace（prompts/page.tsx 参照）。 */
export default async function ArchivedPromptsPage() {
  await requireSessionForPage("/prompts/archive");
  return null;
}
