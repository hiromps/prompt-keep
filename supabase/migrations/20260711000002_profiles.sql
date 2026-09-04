-- アプリ管理のプロフィールテーブル。
-- 認証情報（next_auth スキーマ）と事業データを分離するため、
-- プロジェクト固有のユーザー属性はここ（および features のテーブル）に追加する。

-- updated_at 自動更新の共通トリガー関数
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TABLE public.profiles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id uuid NOT NULL UNIQUE
        REFERENCES next_auth.users (id) ON DELETE CASCADE,
    display_name text NOT NULL DEFAULT '',
    avatar_url text,
    role text NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
    onboarding_completed boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER set_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- RLS は防御層として有効化する。
-- ポリシーを定義しない = anon / authenticated キーからは一切読み書きできない。
-- サーバー（service_role）経由のアクセスのみ許可される。
-- クライアント直接アクセスが必要になったら Optional module として
-- 明示的なポリシーを追加する（docs/auth-and-permissions.md 参照）。
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
