-- 共有プロンプトの「受け取った人がコピーした回数」と、それを元にした公開ランキング。
-- 設計の理由は docs/decisions/0009-shared-copy-ranking.md。
--
-- カウンタは prompts の列でも prompt_shares の列でもなく、別テーブルに置く:
--   - prompts に置くと、+1 のたびに set_updated_at トリガーが updated_at を進めてしまい、
--     一覧の並び順と共有ページの「最終更新」がコピーされるだけで動く
--   - prompt_shares に置くと、停止→再共有（新しい行）で 0 に戻り、ランキングから消える
-- プロンプト単位で累計するので、再共有してもカウントは引き継がれる。

CREATE TABLE public.prompt_share_stats (
    prompt_id uuid PRIMARY KEY
        REFERENCES public.prompts (id) ON DELETE CASCADE,
    copy_count integer NOT NULL DEFAULT 0 CHECK (copy_count >= 0),
    last_copied_at timestamptz NOT NULL DEFAULT now()
);

-- ランキングは copy_count の大きい順に上位 100 件を読むだけ
CREATE INDEX prompt_share_stats_copy_count_idx
    ON public.prompt_share_stats (copy_count DESC, last_copied_at ASC);

-- 他のテーブルと同じ防御層（ポリシーなし = Supabase API からは全拒否）
ALTER TABLE public.prompt_share_stats ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.prompt_share_stats TO service_role;

-- 有効な共有トークン経由でだけ +1 する。
-- 停止済み・存在しないトークン・ゴミ箱行きのプロンプトでは何も起きない
-- （呼び出し側に結果を返さない。トークンの存在を確かめる手掛かりにしないため）。
-- PostgREST は col = col + 1 を書けないので、原子的な加算はここで行う。
CREATE FUNCTION public.increment_shared_copy(p_token text)
RETURNS void
LANGUAGE sql
SET search_path = public
AS $$
    INSERT INTO public.prompt_share_stats (prompt_id, copy_count, last_copied_at)
    SELECT p.id, 1, now()
    FROM public.prompt_shares s
    JOIN public.prompts p ON p.id = s.prompt_id
    WHERE s.token = p_token
      AND s.revoked_at IS NULL
      AND p.deleted_at IS NULL
    ON CONFLICT (prompt_id) DO UPDATE
        SET copy_count = public.prompt_share_stats.copy_count + 1,
            last_copied_at = now();
$$;

-- 関数は 0004 / 0005 の既定権限（TABLES / SEQUENCES）の対象外で、
-- Supabase の既定では PUBLIC に EXECUTE が付く。ここで明示的に外す。
REVOKE ALL ON FUNCTION public.increment_shared_copy(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_shared_copy(text) TO service_role;

-- 公開ランキングが読んでよい列を DB 側で閉じるビュー。
-- id / owner_id は含めない。本文は冒頭 120 文字だけ（全文は /s/<token> で読める）。
-- 停止済み・ゴミ箱行き・コピー 0 件は載せない（共有しただけでは公開一覧に出ない）。
CREATE VIEW public.shared_prompt_ranking
WITH (security_invoker = true)
AS
SELECT
    s.token,
    st.copy_count,
    st.last_copied_at,
    p.title,
    left(p.body, 120) AS snippet,
    p.tags
FROM public.prompt_share_stats st
JOIN public.prompts p ON p.id = st.prompt_id AND p.deleted_at IS NULL
JOIN public.prompt_shares s ON s.prompt_id = p.id AND s.revoked_at IS NULL
WHERE st.copy_count > 0;

-- ビューも TABLES 扱いなので 0005 の既定権限で anon / authenticated には付かないが、明示しておく
REVOKE ALL ON public.shared_prompt_ranking FROM anon, authenticated;
GRANT SELECT ON public.shared_prompt_ranking TO service_role;
