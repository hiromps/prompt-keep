/**
 * プロジェクト構成の単一情報源。
 * 新規プロジェクト開始時はまずこのファイルの meta と modules を編集する。
 * Optional module の有効/無効はここで宣言し、コード側はこのフラグを参照する。
 */
export const projectConfig = {
  meta: {
    name: "prompt-keep",
    description: "よく使うAIプロンプトを貯めて検索・コピーする個人用プロンプト管理",
    version: "0.1.0",
  },
  framework: "nextjs-app-router",
  database: {
    provider: "supabase-postgres",
  },
  auth: {
    provider: "authjs", // Supabase Auth は使用しない
    adapter: "supabase-adapter",
    /** 将来 "database" へ切替可能（docs/auth-and-permissions.md 参照） */
    sessionStrategy: "jwt" as "jwt" | "database",
    providers: ["google"],
  },
  /**
   * Optional modules。Core には含めず、必要になったときに true にして実装を追加する。
   * admin はロールゲートの検証サンプルとして有効化済み（/admin）。
   */
  modules: {
    admin: true,
    organizations: false,
    multiTenant: false,
    payments: false,
    email: false,
    fileUpload: false,
    realtime: false,
    ai: false,
    analytics: false,
    auditLogs: false,
    search: true,
    i18n: false,
  },
  deployment: {
    provider: "vercel",
  },
} as const;

export type ProjectConfig = typeof projectConfig;
export type OptionalModule = keyof ProjectConfig["modules"];
