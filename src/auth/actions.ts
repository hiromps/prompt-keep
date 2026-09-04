"use server";

import { signOut } from "@/auth";

/**
 * ログアウト。Client Component（サイドバー）と Server Component（プロフィール）の
 * 両方から <form action={signOutAction}> で使うため、Server Action として切り出している。
 */
export async function signOutAction() {
  await signOut({ redirectTo: "/" });
}
