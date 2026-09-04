# 0001: 認証は Auth.js、Supabase は PostgreSQL としてのみ使用

- 日付: 2026-07-11
- 状態: 採用

## 背景
Supabase を使う場合、Supabase Auth と Auth.js（NextAuth v5）の2つの認証基盤が選べる。両方を混在させると、ユーザーIDの二重管理・RLS の前提崩れ・セッションの不整合が起きやすい。

## 決定
- 認証は **Auth.js（next-auth 5.0.0-beta 系 / App Router 構成）** のみが担当する
- Supabase は **PostgreSQL データベースとしてのみ**使用し、Supabase Auth は使用しない
- Auth.js のユーザー・アカウント・セッションは `@auth/supabase-adapter` 経由で `next_auth` スキーマに保存する
- アプリ固有のユーザー属性は `public.profiles` に分離し、認証テーブルへ事業データを追加しない

## 理由
- 認証プロバイダーの追加・カスタマイズの自由度が Auth.js の方が高い
- 認証と事業データの分離により、将来 DB を移行しても認証層の影響範囲が明確
- `next_auth` スキーマは Auth.js 公式のアダプタースキーマであり、手を入れずに済む

## 却下した代替案
- **Supabase Auth 単独**: RLS との親和性は高いが、認証ロジックのカスタマイズが Supabase に固定される
- **両方併用**: ID 二重管理になり事故のもと。禁止事項とした

## 影響
- `auth.uid()` は Auth.js ユーザーを指さない。RLS 設計は ADR 0002 に従う
- profiles.auth_user_id が next_auth.users.id への外部キーとなる
