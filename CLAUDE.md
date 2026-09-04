# nextjs-mvp-starter — AI 作業ルール

@AGENTS.md

## 常に守るルール

1. **App Router を使用する**（Pages Router のコード・作法を持ち込まない）
2. **Server Components を初期値**とし、Client Component（"use client"）は必要最小限にする
3. **Supabase Auth は使用しない**。認証は Auth.js（NextAuth v5）が担当する
4. **service role key をクライアントへ渡さない**（`NEXT_PUBLIC_` 禁止、admin client は server-only）
5. **データ更新前に `auth()` と権限を確認する**（`createAuthAction` / `requireUser` / `requireAdmin` を経由し、所有権は `.eq("owner_id", user.id)` 等で検証）
6. **適用済み migration を書き換えない**。DB 変更は常に新しい migration ファイルで行い、`pnpm db:types` で型を再生成する
7. **変更後に型チェック・テスト・ビルドを実行する**: `pnpm check`（typecheck + lint + unit + build）。UI 動線に触れたら `pnpm test:e2e` も
8. **プロジェクト固有コードは `src/features/` 配下**に置く（queries.ts / actions.ts / components/）
9. **仕様変更時は対応する docs を更新する**（構成→ architecture.md、テーブル→ data-model.md、認可→ auth-and-permissions.md、判断→ docs/decisions/）
10. `select("*")` を使わず必要カラムを明示する。エラーは `AppError` / `ActionResult` の共通形式で返す

## 参照先

- 認証・認可の詳細: `docs/auth-and-permissions.md`
- 設計判断の理由: `docs/decisions/`
- 現在の進捗: `docs/implementation-status.md`
- 構成フラグ: `project.config.ts`
