# Auth & Permissions

- **目的**: 認証・認可の仕組みと「やってはいけないこと」を明確にする。セキュリティ上いちばん重要な文書。
- **対象読者**: 開発者本人・AIアシスタント（保護されたデータ操作を書く前に必読）。
- **記入方法**: ロール追加・プロバイダー追加・セッション方式変更時に更新する。

---

## 全体像
- 認証: **Auth.js（NextAuth v5）** + Google OAuth。Supabase Auth は不使用（ADR 0001）
- 保存: `@auth/supabase-adapter` → `next_auth` スキーマ
- セッション: **JWT**（ADR 0003）。`session.user.id` = `next_auth.users.id`、`session.user.role` を含む
- 初回サインイン時に `public.profiles` が自動作成される（`src/auth/profile-sync.ts`）

## 認可の3層
| 層 | 実装 | 役割 |
|---|---|---|
| 1. ページ | `requirePageUser("/path")` / `requirePageAdmin("/path")` | 未ログインは callbackUrl 付きで /signin へ、停止中・権限なしは /unauthorized へ。(protected) 配下の各ページ冒頭で必ず呼ぶ |
| 2. サーバー処理 | `requireUser()` / `requireAdmin()` / `createAuthAction` | **正式な認可**。ID・ロール・所有権・アカウント状態を検証 |
| 3. DB | RLS 有効 + ポリシーなし | 防御層。anon からの直接アクセス全拒否 |

## アカウント状態（suspended）の強制
- `requireUser` / `requireAdmin` は毎回 `profiles` の **status と role を DB で再確認**する。
  `status != 'active'` は FORBIDDEN（JWT が有効期間中でも即座に全データ操作を遮断）
- 再ログインも `signIn` コールバックが拒否する（AccessDenied → /auth-error）
- JWT の role/status はあくまで UI 表示用（`getSessionUser`）。認可判断には使わない

## 使い方
```ts
// 読み取り（Server Component）
const user = await requireUser();
const rows = await listNotesByOwner(user.id); // 必ず所有者スコープ

// 書き込み（Server Action）
export const createPrompt = createAuthAction("prompts.create", createPromptSchema,
  async (input, { user }) => { /* .eq("owner_id", user.id) を忘れない */ });

// 管理者操作: requireAdmin() は JWT でなく DB のロールを再確認する
```

## 禁止事項
- Client Component / `NEXT_PUBLIC_` へ service role key を渡す
- `auth.uid()` が Auth.js ユーザーを指す前提の RLS ポリシーを書く
- middleware や layout だけを認可手段にする
- 認可チェックなしで admin client を使う

## ロール
- `user` / `admin`（`public.profiles.role`、CHECK 制約）
- 付与は SQL で手動: `UPDATE public.profiles SET role='admin' WHERE auth_user_id='...';`
- requireUser / requireAdmin が返す role は **DB の現在値**（昇格・降格は次のリクエストから反映）。
  JWT 内の role はヘッダー表示等の UI 用で、反映には再ログインが必要

## エラーページの使い分け（Auth.js v5 の仕様）
- サインイン系エラー（`OAuthAccountNotLinked` 等、kind="signIn"）→ **`/signin?error=...`**（signin ページが表示）
- それ以外（`Configuration` / `AccessDenied` / `Verification`）→ **`/auth-error?error=...`**
- signIn コールバックで拒否（suspended）した場合は `AccessDenied` になる

## セッション方式の切替（JWT → database）
ADR 0003 の手順を参照。`next_auth.sessions` テーブルは作成済みのため migration 追加は不要。

## プロバイダー追加
1. `src/auth/index.ts` の `providers` に追加（env は `src/lib/env.ts` にも追加）
2. `project.config.ts` の `auth.providers` を更新
3. 同一メールで別プロバイダーの場合の挙動（OAuthAccountNotLinked）を確認
