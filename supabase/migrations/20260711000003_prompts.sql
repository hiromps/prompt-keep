-- プロンプト本体。ユーザー所有データ（owner_id + RLS 有効・ポリシーなし + updated_at トリガー）。
--
-- 状態は3つ。deleted_at が archived_at より優先される
-- （判断の理由は docs/decisions/0005-prompt-data-model.md）:
--   通常       = deleted_at IS NULL AND archived_at IS NULL
--   アーカイブ = deleted_at IS NULL AND archived_at IS NOT NULL
--   ゴミ箱     = deleted_at IS NOT NULL
-- ゴミ箱へ入れても archived_at は消さない。復元は deleted_at を NULL に戻すだけで、
-- アーカイブから来たものはアーカイブへ戻る。

CREATE TABLE public.prompts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    -- 所有者は Auth.js ユーザー ID（セッションの user.id と同一）
    owner_id uuid NOT NULL
        REFERENCES next_auth.users (id) ON DELETE CASCADE,
    -- タイトルは任意。Google Keep 同様、本文だけで保存できる
    -- （空のときはカードに見出しを出さず、本文だけを表示する）
    title text NOT NULL DEFAULT '',
    -- プロンプト本文。そのままコピーして AI に貼り付ける想定
    body text NOT NULL DEFAULT '',
    -- タグは配列で持つ。専用テーブルを作らない理由と代償は
    -- docs/decisions/0005-prompt-data-model.md を参照
    tags text[] NOT NULL DEFAULT '{}' CHECK (cardinality(tags) <= 20),
    is_pinned boolean NOT NULL DEFAULT false,
    archived_at timestamptz,
    deleted_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- 通常ビュー（ピン留め優先・更新の新しい順）用の部分インデックス。
-- 個人利用の件数では性能差は出ないが、想定クエリを形として残す。
CREATE INDEX prompts_active_idx
    ON public.prompts (owner_id, is_pinned DESC, updated_at DESC)
    WHERE deleted_at IS NULL AND archived_at IS NULL;

CREATE INDEX prompts_owner_id_idx ON public.prompts (owner_id, updated_at DESC);

-- タグ絞り込み（tags @> ARRAY[...]）用
CREATE INDEX prompts_tags_idx ON public.prompts USING gin (tags);

CREATE TRIGGER set_prompts_updated_at
    BEFORE UPDATE ON public.prompts
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- 防御層としての RLS（ポリシーなし = クライアント直接アクセス全拒否）。
-- ただしアプリは service_role で接続するため RLS を素通りする。
-- 実際の所有権検証は必ず .eq("owner_id", user.id) 側で行うこと。
ALTER TABLE public.prompts ENABLE ROW LEVEL SECURITY;
