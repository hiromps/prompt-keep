# 0002: データアクセスはサーバー限定、RLS は防御層

- 日付: 2026-07-11
- 状態: 採用

## 背景
Auth.js のセッションは Supabase Auth の JWT ではないため、クライアントから Supabase へ直接アクセスしても `auth.uid()` は機能しない。ここを混同すると「RLS があるから安全」という誤った前提で情報漏洩が起きる。

## 決定
- 認証が必要なデータアクセスは **Server Components / Server Actions / Route Handlers に限定**する
- 各サーバー処理で `auth()`（および requireUser / requireAdmin）により**ユーザーID・ロール・所有権を検証**する
- service role key は `server-only` モジュール（`src/lib/supabase/admin.ts`）のみで使用する
- RLS は**防御層**として全アプリテーブルで有効化し、**ポリシーを定義しない**（= anon からの直接アクセスは全拒否）
- クライアント直接アクセス（Realtime / Storage 含む）は Optional module とし、有効化時に明示的なポリシーを設計する

## 理由
- 認可ロジックが TypeScript のサーバーコードに一元化され、テスト可能になる
- 万一 anon key が悪用されても、RLS 有効 + ポリシーなしで何も読み書きできない
- middleware / layout だけに認可を頼らない（迂回可能なため）

## 却下した代替案
- **Supabase JWT を自前発行して auth.uid() 連携**: 実現可能だが Core には過剰。必要になったら Optional module として追加（next_auth.uid() 関数は migration に用意済み）
- **クライアントから anon key + ポリシーでアクセス**: Auth.js セッションと連動できないため不採用

## 影響
- サーバーのデータ操作は実質 admin client 経由。**その分、safe-action ラッパーと所有権チェック（.eq("owner_id", user.id) 等）を必ず通すこと**
- `select("*")` を避け、必要カラムを明示する
