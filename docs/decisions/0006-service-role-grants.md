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

## 追記（2026-09-04）: anon / authenticated の権限剥奪

上の「anon / authenticated には何も与えない」は、**書いた時点では実現できていなかった**。
service_role へ GRANT しただけで、Supabase が既定で付与する分を REVOKE していなかったため。

ローカルの新しい DB イメージは新規テーブルを自動公開しない（`config.toml` の
`auto_expose_new_tables` の説明にあるとおり、これが新しいクラウド既定でもある）ので
差が見えず、自動公開が有効な世代の本番プロジェクトでだけ anon に SELECT / INSERT が
残っていた。実際に本番で `anon → GET /rest/v1/prompts` が 200（中身は空）を返していた。

情報は漏れていない。全テーブルが RLS 有効・ポリシー0件なので anon からは1行も読めず、
INSERT も RLS で拒否される。ただし守っているのが RLS 一枚だけの状態で、
将来ポリシーを1つ足した瞬間に anon から読めるようになる。

`20260904000001_revoke_anon_grants.sql` で権限そのものを剥がし、
`ALTER DEFAULT PRIVILEGES` で今後のテーブルにも効かせた。
適用後は anon から `42501 permission denied for table prompts` が返る。
