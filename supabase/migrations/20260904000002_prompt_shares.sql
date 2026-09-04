-- 共有リンク。プロンプトを「リンクを知っている人なら誰でも閲覧できる」状態にする。
--
-- 判断の理由は docs/decisions/0007-prompt-sharing.md。要点だけ:
--
-- prompts に share_token 列を足すのではなく別テーブルにしている。
--   * 停止は revoked_at を立てるだけにして、再共有では必ず新しい token を発行する。
--     列で持つと「一度止めたリンクを再共有で復活させる」実装に流れやすく、
--     配った相手から回収したはずのリンクが黙って生き返る。
--   * 過去にどのプロンプトを公開したかが行として残る。
--   * prompts 側は「本人のデータ」という意味を保てる。
--
-- token はアプリ側（Node の randomBytes）で発行する。推測可能性がそのまま
-- アクセス制御になるため、DB のシーケンスや short id は使わない。

CREATE TABLE public.prompt_shares (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    prompt_id uuid NOT NULL
        REFERENCES public.prompts (id) ON DELETE CASCADE,
    -- URL の /s/<token> に入る値。base64url 32文字（24バイト）を想定
    token text NOT NULL UNIQUE,
    created_at timestamptz NOT NULL DEFAULT now(),
    -- NULL = 有効。停止しても行は消さない（いつ何を公開したかの記録を残す）
    revoked_at timestamptz
);

-- 有効な共有は1プロンプトにつき1本まで。
-- 「共有」を連打しても発行済みのリンクが増えないことを DB 側で保証する。
CREATE UNIQUE INDEX prompt_shares_active_prompt_idx
    ON public.prompt_shares (prompt_id)
    WHERE revoked_at IS NULL;

-- token での引き当ては UNIQUE 制約のインデックスがそのまま使われる。

-- 他のテーブルと同じ防御層。アプリは service_role で接続するため素通りするが、
-- Supabase API（anon / authenticated）からは全行拒否になる。
ALTER TABLE public.prompt_shares ENABLE ROW LEVEL SECURITY;

-- 0004 の ALTER DEFAULT PRIVILEGES で自動的に付くが、
-- 既定権限の設定漏れに気づけないので明示的にも書いておく。
GRANT SELECT, INSERT, UPDATE, DELETE ON public.prompt_shares TO service_role;
