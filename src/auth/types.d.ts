import type { DefaultSession } from "next-auth";
import type { AppRole } from "@/auth/roles";

declare module "next-auth" {
  interface Session {
    user: {
      /** next_auth.users.id（Auth.js のユーザー ID） */
      id: string;
      role: AppRole;
    } & DefaultSession["user"];
  }
}

// next-auth/jwt は @auth/core/jwt の再エクスポートのため、実体側を拡張する
// （@auth/core は next-auth と同じバージョンを package.json に固定している）
declare module "@auth/core/jwt" {
  interface JWT {
    uid?: string;
    role?: AppRole;
  }
}
