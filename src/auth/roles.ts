/**
 * アプリのロール定義。プロフィール（public.profiles.role）が正とする。
 * JWT にもロールを載せるが、これは UI 表示・軽い出し分け用。
 * 管理者操作の実行時は必ず DB を再確認する（guards.ts の requireAdmin 参照）。
 */
export const APP_ROLES = ["user", "admin"] as const;
export type AppRole = (typeof APP_ROLES)[number];

export function isAppRole(value: unknown): value is AppRole {
  return typeof value === "string" && (APP_ROLES as readonly string[]).includes(value);
}
