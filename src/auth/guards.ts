import "server-only";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAppRole, type AppRole } from "@/auth/roles";

export type AuthenticatedUser = {
  /** next_auth.users.id */
  id: string;
  role: AppRole;
  email?: string | null;
  name?: string | null;
};

/**
 * 現在のセッションユーザーを返す（未ログインなら null）。
 * JWT のみを参照する軽量版。表示の出し分け用で、認可判断には requireUser 系を使うこと。
 */
export async function getSessionUser(): Promise<AuthenticatedUser | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  return {
    id: session.user.id,
    role: session.user.role,
    email: session.user.email,
    name: session.user.name,
  };
}

type AccountState = { role: AppRole; status: string };

/** profiles から現在のロールと状態を取得する（JWT の古さに依存しないための単一情報源）。 */
async function loadAccountState(authUserId: string): Promise<AccountState | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("role, status")
    .eq("auth_user_id", authUserId)
    .maybeSingle();

  if (error) {
    throw new AppError("INTERNAL", "アカウント状態の確認に失敗しました", { cause: error });
  }
  if (!data) return null;
  return { role: isAppRole(data.role) ? data.role : "user", status: data.status };
}

/**
 * 認証必須（Server Action / Route Handler / 保護ページ用）。
 * - 未ログインは UNAUTHORIZED
 * - 停止中（profiles.status != 'active'）は FORBIDDEN（JWT が生きていても常に拒否）
 * - 返すロールは DB の現在値（JWT の古いロールを信用しない）
 */
export async function requireUser(): Promise<AuthenticatedUser> {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    throw new AppError("UNAUTHORIZED", "ログインが必要です");
  }

  const state = await loadAccountState(sessionUser.id);
  if (!state) {
    // 初回サインイン直後の欠損など。ブロックせず JWT のロールで継続（要監視）
    logger.warn("profile missing for authenticated user", { authUserId: sessionUser.id });
    return sessionUser;
  }
  if (state.status !== "active") {
    throw new AppError("FORBIDDEN", "このアカウントは停止されています");
  }
  return { ...sessionUser, role: state.role };
}

/** 管理者必須。profiles に裏付けられた active な admin のみ許可する。 */
export async function requireAdmin(): Promise<AuthenticatedUser> {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    throw new AppError("UNAUTHORIZED", "ログインが必要です");
  }
  const state = await loadAccountState(sessionUser.id);
  if (!state || state.status !== "active" || state.role !== "admin") {
    throw new AppError("FORBIDDEN", "管理者権限が必要です");
  }
  return { ...sessionUser, role: "admin" };
}

/**
 * 保護ページ用ガード。未ログインは callbackUrl 付きでサインインへ、
 * 停止中は /unauthorized へリダイレクトする。
 */
export async function requirePageUser(currentPath: string): Promise<AuthenticatedUser> {
  return handlePageGuard(requireUser, currentPath);
}

/** 管理者専用ページ用ガード。 */
export async function requirePageAdmin(currentPath: string): Promise<AuthenticatedUser> {
  return handlePageGuard(requireAdmin, currentPath);
}

async function handlePageGuard(
  guard: () => Promise<AuthenticatedUser>,
  currentPath: string,
): Promise<AuthenticatedUser> {
  let user: AuthenticatedUser;
  try {
    user = await guard();
  } catch (error) {
    if (error instanceof AppError && error.code === "UNAUTHORIZED") {
      redirect(`/signin?callbackUrl=${encodeURIComponent(currentPath)}`);
    }
    if (error instanceof AppError && error.code === "FORBIDDEN") {
      redirect("/unauthorized");
    }
    throw error;
  }
  return user;
}
