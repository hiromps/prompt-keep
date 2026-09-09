-- next_auth スキーマのテーブルから anon / authenticated の権限を剥がす。
--
-- 背景: 0005 (20260904000001) で public スキーマの既定付与を剥がしたが、
-- 対象を public に限っていたため next_auth.* には Supabase 既定の
-- SELECT / INSERT / UPDATE / DELETE が anon / authenticated に残っていた。
--
-- 実害は無い。next_auth スキーマの USAGE は service_role と postgres にしか
-- 与えていない (20260711000001) ため、テーブル権限があっても anon /
-- authenticated はこれらのテーブルに到達できない。
-- public と同じ二重防御に揃えるため、権限そのものを外す。
--
-- Auth.js Adapter は service_role で接続する (src/lib/supabase/admin.ts) ので
-- これで壊れる経路は無い。

REVOKE ALL ON ALL TABLES IN SCHEMA next_auth FROM anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA next_auth FROM anon, authenticated;

-- 今後 next_auth に足すテーブルにも効かせる
ALTER DEFAULT PRIVILEGES IN SCHEMA next_auth
    REVOKE ALL ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA next_auth
    REVOKE ALL ON SEQUENCES FROM anon, authenticated;
