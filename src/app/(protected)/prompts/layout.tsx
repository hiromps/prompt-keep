import { Suspense } from "react";
import { getSessionUser, resolvePageAccount, type AuthenticatedUser } from "@/auth/guards";
import { listPromptsByOwner } from "@/features/prompts/queries";
import { PromptsWorkspace } from "@/features/prompts/components/prompts-workspace";
import Loading from "@/app/(protected)/loading";

/**
 * /prompts 配下の共有レイアウト。**所有者の全行をここで1回だけ取得する。**
 *
 * 通常 / アーカイブ / ゴミ箱 / タグ絞り込みは、同じデータをクライアント側で
 * 絞り込んでいるだけ。クライアント遷移では出発地と行き先が共有するレイアウトより下しか
 * 再描画されないので、データをここに置けばビューの切り替えでサーバー往復が起きない。
 * どのビューを見せるかは PromptsWorkspace が URL から決める。
 *
 * 各 page.tsx は URL を存在させ、未ログイン時に正確な callbackUrl で /signin へ飛ばすだけ。
 * 停止中アカウントの /unauthorized はこちらが担う（両者が同時に redirect することはない。
 * guards.ts の requireSessionForPage を参照）。
 */
export default async function PromptsLayout({ children }: { children: React.ReactNode }) {
  const session = await getSessionUser();
  // 未ログインは page 側が正確な callbackUrl でリダイレクトする。ここでは何もしない
  if (!session) return children;

  // レイアウトが Cookie や DB を読むと (protected)/loading.tsx は効かず、
  // /profile などから「入ってくる」遷移が無表示のまま待たされる。
  // データ待ちをこの境界に閉じ込めて、入場時は今まで通りスピナーを出す。
  // ビューの切り替えではレイアウトが再描画されないので、この境界は現れない。
  return (
    <Suspense fallback={<Loading />}>
      <PromptsData session={session}>{children}</PromptsData>
    </Suspense>
  );
}

async function PromptsData({
  session,
  children,
}: {
  session: AuthenticatedUser;
  children: React.ReactNode;
}) {
  // 状態確認（停止中なら /unauthorized）と全件取得は互いに依存しないので並べて待つ
  const [, prompts] = await Promise.all([
    resolvePageAccount(session),
    listPromptsByOwner(session.id),
  ]);

  return <PromptsWorkspace prompts={prompts}>{children}</PromptsWorkspace>;
}
