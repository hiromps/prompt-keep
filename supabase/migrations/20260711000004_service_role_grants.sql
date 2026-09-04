-- public スキーマのテーブルに対する service_role の権限を明示的に付与する。
--
-- 背景: 新しい Supabase の DB イメージでは、postgres が public に作ったテーブルの
-- 既定権限から anon / authenticated / service_role の SELECT/INSERT/UPDATE/DELETE が
-- 外れている（pg_default_acl 上は Dxtm のみ）。アプリは service_role で接続するため、
-- 既定権限に頼ったままだと profiles すら読めず、ログイン時点で 42501 になる。
-- next_auth スキーマ側は 001 で明示 GRANT しており、それと同じ方針を public にも適用する。
--
-- anon / authenticated には何も与えない。全テーブルは RLS 有効・ポリシー0件であり、
-- 権限自体を渡さないことで Supabase API からの直接アクセスを二重に塞ぐ。

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.prompts TO service_role;

-- 今後 public に追加するテーブルにも自動で効くようにする
-- （migration ごとに GRANT を書き忘れても壊れないようにするため）
ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO service_role;
