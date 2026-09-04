import "server-only";
import { cache } from "react";
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
 * JWT のみを参照する軽量版。表示の出し分けと「未ログインなら /signin へ」の判定に使い、
 * 認可判断には requireUser 系 / resolveAccount を使うこと。
 *
 * React の cache() で包み、同じリクエスト内では JWT の復号を1回にする
 * （初回表示では root layout の SiteHeader、prompts の layout、page が同時に呼ぶ）。
 */
export const getSessionUser = cache(async (): Promise<AuthenticatedUser | null> => {
  const session = await auth();
  if (!session?.user?.id) return null;
  return {
    id: session.user.id,
    role: session.user.role,
    email: session.user.email,
    name: session.user.name,
  };
});

type AccountState = { role: AppRole; status: string };

/**
 * profiles から現在のロールと状態を取得する（JWT の古さに依存しないための単一情報源）。
 * リクエスト内で同じユーザーを二度引かないよう cache() で包む。
 */
const loadAccountState = cache(async (authUserId: string): Promise<AccountState | null> => {
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
});

/**
 * セッションユーザーを DB の現在値で確定する。
 * - 停止中（profiles.status != 'active'）は FORBIDDEN（JWT が生きていても常に拒否）
 * - 返すロールは DB の現在値（JWT の古いロールを信用しない）
 *
 * requireUser から切り出してあるのは、セッション確認の後に「状態確認」と「ページのデータ取得」を
 * Promise.all で並べて走らせられるようにするため（直列だと DB 往復がそのぶん積み上がる）。
 */
export async function resolveAccount(sessionUser: AuthenticatedUser): Promise<AuthenticatedUser> {
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

/** 管理者として確定する。profiles に裏付けられた active な admin のみ許可する。 */
export async function resolveAdmin(sessionUser: AuthenticatedUser): Promise<AuthenticatedUser> {
  const state = await loadAccountState(sessionUser.id);
  if (!state || state.status !== "active" || state.role !== "admin") {
    throw new AppError("FORBIDDEN", "管理者権限が必要です");
  }
  return { ...sessionUser, role: "admin" };
}

/**
 * 認証必須（Server Action / Route Handler / 保護ページ用）。
 * - 未ログインは UNAUTHORIZED
 * - 停止中は FORBIDDEN、ロールは DB の現在値（resolveAccount 参照）
 */
export async function requireUser(): Promise<AuthenticatedUser> {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    throw new AppError("UNAUTHORIZED", "ログインが必要です");
  }
  return resolveAccount(sessionUser);
}

/** 管理者必須。profiles に裏付けられた active な admin のみ許可する。 */
export async function requireAdmin(): Promise<AuthenticatedUser> {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    throw new AppError("UNAUTHORIZED", "ログインが必要です");
  }
  return resolveAdmin(sessionUser);
}

/**
 * ページ用: 未ログインなら callbackUrl 付きでサインインへ。**DB は見ない**。
 *
 * layout がデータを持つルート（/prompts 配下）では、page は URL を存在させて
 * 正確な callbackUrl を返すためだけにある。停止中の判定は layout 側の resolvePageAccount が担う。
 *
 * 不変条件: 1つのリクエストで redirect() を投げるセグメントは高々1つ。
 * page は「セッション無し」のときだけ、layout は「セッションあり かつ 停止中」のときだけ
 * リダイレクトするので両立しない（どちらも cache() 済みの同じ Cookie 読み取りを見る）。
 * 2つのセグメントが別々の行き先へ redirect したときの勝敗は Next.js が定義していない。
 */
export async function requireSessionForPage(currentPath: string): Promise<AuthenticatedUser> {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    redirect(`/signin?callbackUrl=${encodeURIComponent(currentPath)}`);
  }
  return sessionUser;
}

/** ページ用: resolveAccount の停止中（FORBIDDEN）を /unauthorized へのリダイレクトに変える。 */
export async function resolvePageAccount(sessionUser: AuthenticatedUser): Promise<AuthenticatedUser> {
  return handlePageGuard(() => resolveAccount(sessionUser), "/");
}

/** ページ用: resolveAdmin の権限なし（FORBIDDEN）を /unauthorized へのリダイレクトに変える。 */
export async function resolvePageAdmin(sessionUser: AuthenticatedUser): Promise<AuthenticatedUser> {
  return handlePageGuard(() => resolveAdmin(sessionUser), "/");
}

/**
 * 保護ページ用ガード（セッション確認と状態確認を一度に行う版）。
 * 未ログインは callbackUrl 付きでサインインへ、停止中は /unauthorized へリダイレクトする。
 * ページ内で他に待つものが無いときはこれで足りる。データ取得と並列にしたいときは
 * requireSessionForPage + resolvePageAccount を使う。
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
    // redirect() は NEXT_REDIRECT を投げる。try の外（catch 節）で呼んでいるので飲み込まれない
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
