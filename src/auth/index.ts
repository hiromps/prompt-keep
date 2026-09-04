import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { SupabaseAdapter } from "@auth/supabase-adapter";
import { serverEnv } from "@/lib/env";
import { ensureProfile } from "@/auth/profile-sync";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Auth.js（NextAuth v5）設定。
 *
 * - 認証は Auth.js が担当し、Supabase Auth は使用しない
 * - ユーザー / アカウント等は Supabase Adapter 経由で next_auth スキーマに保存
 * - セッションは JWT 方式（adapter があるため明示指定が必須）。
 *   database 方式へ切り替える場合は session.strategy を "database" にし、
 *   jwt/session コールバックを database 用に調整する（docs/auth-and-permissions.md 参照）
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: SupabaseAdapter({
    url: serverEnv.SUPABASE_URL,
    secret: serverEnv.SUPABASE_SERVICE_ROLE_KEY,
  }),
  session: { strategy: "jwt" },
  providers: [Google],
  pages: {
    signIn: "/signin",
    error: "/auth-error",
  },
  callbacks: {
    async signIn({ user }) {
      // 停止中アカウントの再ログインを拒否する（UX 目的の早期ゲート）。
      // ここが通っても、データアクセス時は requireUser が status を常時強制する。
      if (!user?.id) return true;
      try {
        const supabase = createAdminClient();
        const { data } = await supabase
          .from("profiles")
          .select("status")
          .eq("auth_user_id", user.id)
          .maybeSingle();
        if (data && data.status !== "active") return false; // → AccessDenied
      } catch {
        // 新規ユーザー（profiles 未作成 / id 未確定）や一時的な DB 障害では判定せず通す
      }
      return true;
    },
    async jwt({ token, user }) {
      // user はサインイン時のみ存在する（adapter が返した next_auth.users の行）
      if (user?.id) {
        token.uid = user.id;
        const profile = await ensureProfile({
          authUserId: user.id,
          displayName: user.name,
          avatarUrl: user.image,
        });
        token.role = profile.role;
      }
      return token;
    },
    session({ session, token }) {
      if (token.uid) {
        session.user.id = token.uid;
      }
      session.user.role = token.role ?? "user";
      return session;
    },
  },
});
