-- public スキーマのテーブルから anon / authenticated の権限を剥がす。
--
-- 背景: 0004 のコメントで「anon / authenticated には何も与えない」と書いたが、
-- 実際に書いたのは service_role への GRANT だけで、Supabase が既定で付与する分を
-- 剥がしていなかった。ローカルの新しい DB イメージは既定で自動公開しないため
-- 差が見えず、本番（自動公開が有効な世代のプロジェクト）でだけ anon に
-- SELECT / INSERT が付いたままになっていた。
--
-- 実害は無かった。全テーブルが RLS 有効・ポリシー0件なので anon からは
-- 1行も読めず、書き込みも RLS で弾かれる。ただし守っているのが RLS 一枚だけの
-- 状態で、将来ポリシーを1つ足した瞬間に anon から読めるようになる。
-- 権限そのものを外して二重にする。
--
-- アプリは service_role でのみ接続する（src/lib/supabase/admin.ts）ので、
-- これで壊れる経路は無い。Supabase Auth も使っていないため authenticated も未使用。

REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;

-- 今後 public に足すテーブルにも効かせる（0004 の service_role 付与と対になる）
ALTER DEFAULT PRIVILEGES IN SCHEMA public
    REVOKE ALL ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
    REVOKE ALL ON SEQUENCES FROM anon, authenticated;
