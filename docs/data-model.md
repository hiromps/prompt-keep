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

### notes（サンプルB・所有データのテンプレート）
| カラム | 型 | 備考 |
|---|---|---|
| id | uuid PK | |
| owner_id | uuid | FK → next_auth.users(id) ON DELETE CASCADE。セッションの user.id と同一 |
| title / content | text | |
| created_at / updated_at | timestamptz | トリガー自動更新 |

## 新テーブル設計パターン
1. 所有データは `owner_id uuid REFERENCES next_auth.users(id) ON DELETE CASCADE`
2. `ALTER TABLE ... ENABLE ROW LEVEL SECURITY;`（ポリシーは書かない = 防御層）
3. `updated_at` トリガー（`public.set_updated_at()` を再利用）
4. `pnpm db:types` で型再生成 → queries は必要カラムを明示 select

## プロジェクト固有テーブル
（追加したらここへ）
