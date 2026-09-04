# 0006: public スキーマへの service_role 明示 GRANT

- 日付: 2026-09-04
- 状態: 採用

## 背景
`supabase start`（CLI 2.109 / 新しい DB イメージ）で立ち上げたローカル環境では、
`postgres` が `public` に作ったテーブルの既定権限から
anon / authenticated / service_role の SELECT / INSERT / UPDATE / DELETE が外れている
（`pg_default_acl` 上は `Dxtm` のみ）。

アプリは service_role キーで接続するため、既定権限に頼ったままだと
`profiles` すら読めず、ログイン直後の `loadAccountState()` が
`42501 permission denied for table profiles` で失敗する。
スターターは `next_auth` スキーマには明示 GRANT を書いていたが、`public` は既定権限任せだった。

## 決定
`supabase/migrations/20260711000004_service_role_grants.sql` で明示的に付与する。

- 既存テーブル（`profiles` / `prompts`）へ `GRANT SELECT, INSERT, UPDATE, DELETE ... TO service_role`
- 今後の追加分に備えて `ALTER DEFAULT PRIVILEGES IN SCHEMA public` でも同じ権限を付与
- **anon / authenticated には何も与えない**

## 理由
- 権限をアプリのリポジトリ内で明示すれば、Supabase のイメージ側の既定値が変わっても壊れない
- `next_auth` 側の既存の書き方と揃う
- anon / authenticated に渡さないことで、RLS 有効・ポリシー0件（[0002](0002-server-only-data-access-rls-as-defense.md)）
  に加えて権限レベルでも Supabase API からの直接アクセスを塞げる（二重の防御）

## 影響
- `public` に新テーブルを足すとき、GRANT の書き忘れで壊れることはない（既定権限が効く）
- 本番 Supabase プロジェクトでもこの migration がそのまま適用される。
  既に権限がある環境では再付与になるだけで無害
