# Data Model

- **目的**: テーブル構成と所有関係の現在形を示す。migration の羅列ではなく「結果としての形」を書く。
- **対象読者**: 開発者本人・AIアシスタント（新テーブル設計時にパターンを参照）。
- **記入方法**: migration を追加したら該当セクションを更新し、`pnpm db:types` で型を再生成する。

---

## スキーマ構成
- `next_auth`: Auth.js 管理（**事業データを追加しない**）
- `public`: アプリ管理

## next_auth（Auth.js 管理）
| テーブル | 用途 |
|---|---|
| users | 認証ユーザー（id, name, email, emailVerified, image） |
| accounts | OAuth プロバイダー紐付け |
| sessions | database セッション用（JWT 方式では未使用） |
| verification_tokens | メール認証等 |

## public（アプリ管理）

### profiles
Auth.js ユーザー1人につき1行。初回サインイン時に自動作成される（`src/auth/profile-sync.ts`）。

| カラム | 型 | 備考 |
|---|---|---|
| id | uuid PK | |
| auth_user_id | uuid UNIQUE | FK → next_auth.users(id) ON DELETE CASCADE |
| display_name | text | 既定 '' |
| avatar_url | text NULL | |
| role | text | 'user' / 'admin'（CHECK 制約） |
| status | text | 'active' / 'suspended'（CHECK 制約） |
| onboarding_completed | boolean | 既定 false |
| created_at / updated_at | timestamptz | updated_at はトリガー自動更新 |

### prompts（本アプリの中核・所有データ）
1ユーザーが自分のプロンプトを持つ。状態モデルの詳細は
[0005-prompt-data-model.md](decisions/0005-prompt-data-model.md)。

| カラム | 型 | 備考 |
|---|---|---|
| id | uuid PK | |
| owner_id | uuid | FK → next_auth.users(id) ON DELETE CASCADE。セッションの user.id と同一 |
| title | text | 既定 ''。**任意**。空ならカードに見出しを出さず本文だけ表示する |
| body | text | 既定 ''。プロンプト本文。改行は LF に正規化して保存 |
| tags | text[] | 既定 '{}'。CHECK cardinality(tags) <= 20。GIN インデックスあり |
| is_pinned | boolean | 既定 false。通常ビューでのみ意味を持つ |
| archived_at | timestamptz NULL | NULL 以外 = アーカイブ済み |
| deleted_at | timestamptz NULL | NULL 以外 = ゴミ箱。archived_at より優先される |
| created_at / updated_at | timestamptz | トリガー自動更新 |

ビューの判定条件:

| ビュー | 条件 |
|---|---|
| 通常 | `deleted_at IS NULL AND archived_at IS NULL` |
| アーカイブ | `deleted_at IS NULL AND archived_at IS NOT NULL` |
| ゴミ箱 | `deleted_at IS NOT NULL` |

ゴミ箱へ入れても `archived_at` は消さないので、復元すると元の場所へ戻る。
ゴミ箱の自動削除は行わない（cron が無いため、手動で完全削除するまで残る）。

### prompt_shares（共有リンク）
1件のプロンプトを「リンクを知っている人なら誰でも閲覧できる」状態にする。
設計の理由は [0007-prompt-sharing.md](decisions/0007-prompt-sharing.md)。

| カラム | 型 | 備考 |
|---|---|---|
| id | uuid PK | |
| prompt_id | uuid | FK → public.prompts(id) ON DELETE CASCADE |
| token | text UNIQUE | URL の `/s/<token>`。`randomBytes(24)` の base64url 32文字。アプリ側で発行する |
| created_at | timestamptz | |
| revoked_at | timestamptz NULL | NULL = 有効。停止しても行は消さない |

- 有効な共有は1プロンプトにつき1本まで（`revoked_at IS NULL` の部分ユニークインデックス）
- 停止は `revoked_at` を立てるだけ。再共有では**必ず新しい token を発行する**ので、
  いったん止めたリンクが復活することはない
- `owner_id` を持たない。所有権は必ず `prompts` 側を先に引いて確認する
  （`assertPromptOwner`, `src/features/prompts/actions.ts`）
- 配信条件: `revoked_at IS NULL AND prompts.deleted_at IS NULL`。
  アーカイブ済みは配信を続ける（アーカイブは持ち主の整理都合であって共有の停止ではない）

## 新テーブル設計パターン
1. 所有データは `owner_id uuid REFERENCES next_auth.users(id) ON DELETE CASCADE`
2. `ALTER TABLE ... ENABLE ROW LEVEL SECURITY;`（ポリシーは書かない = 防御層）
3. `updated_at` トリガー（`public.set_updated_at()` を再利用）
4. `pnpm db:types` で型再生成 → queries は必要カラムを明示 select

`public` への GRANT / REVOKE は `20260711000004_service_role_grants.sql` と
`20260904000001_revoke_anon_grants.sql` の `ALTER DEFAULT PRIVILEGES` で自動的に効くため、
テーブルごとに書く必要はない（service_role には付与、anon / authenticated からは剥奪。
[0006](decisions/0006-service-role-grants.md)）。

## プロジェクト固有テーブル
`prompts` と `prompt_shares`。
