import { notFound } from "next/navigation";
import { projectConfig } from "@config";
import { requirePageAdmin } from "@/auth/guards";
import { listAllProfiles } from "@/features/admin/queries";

export const metadata = { title: "管理" };

/**
 * 管理者専用ページ（サンプルB: 管理者権限の簡易サンプル）。
 * - modules.admin が無効ならルート自体を 404 にする
 * - requirePageAdmin が DB のロール・状態を再確認する（JWT のロールだけを信用しない）。
 *   未ログインは /signin?callbackUrl=/admin、権限なしは /unauthorized へ
 */
export default async function AdminPage() {
  if (!projectConfig.modules.admin) notFound();

  await requirePageAdmin("/admin");

  const profiles = await listAllProfiles();

  return (
    <div>
      <h1 className="text-2xl font-bold">ユーザー管理</h1>
      <p className="mt-1 text-sm text-zinc-600">登録ユーザー一覧（最新100件）</p>
      <table className="mt-6 w-full text-left text-sm">
        <thead>
          <tr className="border-b border-zinc-200 text-zinc-500">
            <th className="py-2 pr-4 font-medium">表示名</th>
            <th className="py-2 pr-4 font-medium">ロール</th>
            <th className="py-2 pr-4 font-medium">状態</th>
            <th className="py-2 font-medium">登録日</th>
          </tr>
        </thead>
        <tbody>
          {profiles.map((p) => (
            <tr key={p.id} className="border-b border-zinc-100">
              <td className="py-2 pr-4">{p.display_name || "(未設定)"}</td>
              <td className="py-2 pr-4">{p.role}</td>
              <td className="py-2 pr-4">{p.status}</td>
              <td className="py-2">{new Date(p.created_at).toLocaleDateString("ja-JP")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
