-- サンプルB: ユーザー所有データ（notes）の例。
-- 新しい所有データを作るときはこのテーブルをテンプレートにする:
--   owner_id + RLS 有効化（ポリシーなし）+ updated_at トリガー

CREATE TABLE public.notes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    -- 所有者は Auth.js ユーザー ID（セッションの user.id と同一）
    owner_id uuid NOT NULL
        REFERENCES next_auth.users (id) ON DELETE CASCADE,
    title text NOT NULL,
    content text NOT NULL DEFAULT '',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX notes_owner_id_idx ON public.notes (owner_id, created_at DESC);

CREATE TRIGGER set_notes_updated_at
    BEFORE UPDATE ON public.notes
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- 防御層としての RLS（ポリシーなし = クライアント直接アクセス全拒否）
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
