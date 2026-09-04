import { requireSessionForPage, resolvePageAccount } from "@/auth/guards";
import { getProfileByAuthUserId } from "@/features/profile/queries";
import { ProfileForm } from "@/features/profile/components/profile-form";
import { signOutAction } from "@/auth/actions";
import { ProtectedShell } from "@/components/protected-shell";
import { UserAvatar } from "@/components/user-avatar";

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
      <ProtectedShell>
        <p className="mx-auto w-full max-w-3xl px-4 py-6 text-sm text-[var(--muted)]">
          プロフィールが見つかりません。一度ログアウトして再ログインしてください。
        </p>
      </ProtectedShell>
    );
  }

  return (
    <ProtectedShell>
      <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:py-8">
        <div className="flex items-center gap-4">
          <UserAvatar image={user.image} name={user.name} email={user.email} size={56} />
          <div className="min-w-0">
            <h1 className="text-xl font-bold sm:text-2xl">プロフィール</h1>
            <p className="truncate text-sm text-[var(--muted)]">{user.email ?? "-"}</p>
          </div>
        </div>

        {/* 狭い画面では見出しと値を縦に、sm 以上では横に並べる */}
        <dl className="mt-6 space-y-3 text-sm">
          <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-2">
            <dt className="text-[var(--muted)] sm:w-28 sm:shrink-0">ロール</dt>
            <dd>{profile.role}</dd>
          </div>
          <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-2">
            <dt className="text-[var(--muted)] sm:w-28 sm:shrink-0">登録日</dt>
            <dd>{new Date(profile.created_at).toLocaleDateString("ja-JP")}</dd>
          </div>
        </dl>

        <div className="mt-8">
          <ProfileForm initialDisplayName={profile.display_name} />
        </div>

        {/* ヘッダーのアバターはここへ来る。サイドバーの無い状態でもログアウトに辿り着けるようにする */}
        <form action={signOutAction} className="mt-10 border-t border-[var(--border)] pt-6">
          <button
            type="submit"
            className="w-full rounded-md border border-[var(--border)] px-4 py-2 text-sm hover:bg-[var(--chip)] sm:w-auto"
          >
            ログアウト
          </button>
        </form>
      </div>
    </ProtectedShell>
  );
}
