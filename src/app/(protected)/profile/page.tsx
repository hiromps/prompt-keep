import { requireSessionForPage, resolvePageAccount } from "@/auth/guards";
import { getProfileByAuthUserId } from "@/features/profile/queries";
import { ProfileForm } from "@/features/profile/components/profile-form";

export const metadata = { title: "プロフィール" };

/** プロフィール画面（サンプルA）。自分のプロフィールの表示と更新。 */
export default async function ProfilePage() {
  const session = await requireSessionForPage("/profile");
  // 状態確認（停止中なら /unauthorized）と本体の取得は互いに依存しないので並べて待つ。
  // 取得結果は状態確認が通ってから描画されるので、停止中の人に中身が出ることはない
  const [user, profile] = await Promise.all([
    resolvePageAccount(session),
    getProfileByAuthUserId(session.id),
  ]);

  if (!profile) {
    // 通常は初回サインイン時に作成される。欠損時は再ログインを促す
    return (
      <p className="mx-auto w-full max-w-3xl px-4 py-6 text-sm text-[var(--muted)]">
        プロフィールが見つかりません。一度ログアウトして再ログインしてください。
      </p>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6">
      <h1 className="text-2xl font-bold">プロフィール</h1>
      <dl className="mt-6 space-y-2 text-sm">
        <div className="flex gap-2">
          <dt className="w-28 text-zinc-500">メール</dt>
          <dd>{user.email ?? "-"}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="w-28 text-zinc-500">ロール</dt>
          <dd>{profile.role}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="w-28 text-zinc-500">登録日</dt>
          <dd>{new Date(profile.created_at).toLocaleDateString("ja-JP")}</dd>
        </div>
      </dl>
      <div className="mt-8">
        <ProfileForm initialDisplayName={profile.display_name} />
      </div>
    </div>
  );
}
