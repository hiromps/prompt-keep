# nextjs-mvp-starter

個人開発者が新規 MVP を高速かつ安全に開始するための再利用可能な Next.js スターター。

- **Next.js App Router**（TypeScript strict / Tailwind CSS v4 / pnpm）
- **認証: Auth.js（NextAuth v5）+ Google OAuth**（Supabase Auth は不使用）
- **DB: Supabase PostgreSQL**（Auth.js のデータは `next_auth` スキーマ、アプリデータは `public`）
- Zod / Vitest / Playwright / GitHub Actions / Vercel

設計判断の理由は `docs/decisions/`、認証・認可の詳細は `docs/auth-and-permissions.md` を参照。

## 必要なもの

- Node.js 20.19+（supabase-js は 22 を推奨）
- pnpm 10+
- Docker Desktop（Supabase ローカル用）
- Google Cloud Console アカウント（OAuth クライアント作成用）

> **macOS でも動作します。** Next.js / pnpm / Docker Desktop / Supabase CLI はすべてクロスプラットフォーム対応で、Windows 固有のコードは含まれていません。macOS 初心者向けの準備手順は次の節を参照してください。

### macOS での準備（初めての方向け）

1. **Homebrew をインストール**（未導入の場合）
   ターミナル（`アプリケーション > ユーティリティ > ターミナル`）を開いて実行:
   ```bash
   /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
   ```
2. **Node.js と pnpm をインストール**
   ```bash
   brew install node pnpm
   ```
3. **Docker Desktop for Mac をインストール**
   [公式サイト](https://www.docker.com/products/docker-desktop/)から Mac 版（Apple Silicon / Intel を選択）をダウンロードしてインストールし、起動しておく（Supabase ローカル環境の起動に必要）。
4. あとは下記の「セットアップ」を Windows と同じ手順で進めればOK。`.env.local` の作成や `AUTH_SECRET` 生成に使う `openssl` は macOS に標準搭載済みなので追加インストール不要。

## セットアップ

### 1. 依存関係のインストール

```bash
pnpm install
```

### 2. Supabase ローカル環境の起動（migration も自動適用される）

```bash
pnpm db:start
```

出力される `ANON_KEY` と `SERVICE_ROLE_KEY` を次の手順で使う。

### 3. 環境変数

```bash
cp .env.example .env.local
```

`.env.local` を編集:

| 変数 | 値 |
|---|---|
| `SUPABASE_URL` | `http://127.0.0.1:54321` |
| `SUPABASE_ANON_KEY` | `pnpm db:start` の出力 |
| `SUPABASE_SERVICE_ROLE_KEY` | `pnpm db:start` の出力（**クライアントへ渡さない**） |
| `AUTH_SECRET` | `openssl rand -base64 32` で生成 |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | 手順4で取得 |

### 4. Google OAuth クライアントの作成

1. [Google Cloud Console](https://console.cloud.google.com/apis/credentials) → 認証情報 → OAuth クライアント ID（ウェブアプリケーション）
2. 承認済みリダイレクト URI に `http://localhost:3000/api/auth/callback/google` を追加
3. クライアント ID / シークレットを `.env.local` に設定

### 5. 起動

```bash
pnpm dev
```

http://localhost:3000 → 「Googleで始める」でログイン → /profile と /dashboard が動けばセットアップ完了。

### 6. 管理者にする（任意）

```bash
docker exec supabase_db_nextjs-mvp-starter psql -U postgres \
  -c "UPDATE public.profiles SET role='admin' WHERE display_name='<あなたの表示名>';"
```

再ログイン後 `/admin` にアクセスできる。

## コマンド

| コマンド | 内容 |
|---|---|
| `pnpm dev` / `pnpm build` / `pnpm start` | 開発 / 本番ビルド / 本番起動 |
| `pnpm check` | typecheck + lint + unit test + build を一括実行 |
| `pnpm test` / `pnpm test:e2e` | Vitest / Playwright（E2E は初回 `pnpm exec playwright install chromium`） |
| `pnpm db:start` / `db:stop` / `db:reset` | Supabase ローカルの起動 / 停止 / migration 再適用 |
| `pnpm db:types` | DB 型定義の再生成（migration 追加後に必ず実行） |

## デプロイ（Vercel + Supabase 本番）

1. Supabase で本番プロジェクト作成 → `supabase link --project-ref <ref>` → `supabase db push`
2. Supabase ダッシュボード → Settings → API → **Exposed schemas に `next_auth` を追加**
3. Vercel にリポジトリを接続し、`.env.example` の6変数を本番値で設定
4. Google OAuth に本番リダイレクト URI（`https://<domain>/api/auth/callback/google`）を追加

## プロジェクトを開始するときにやること

1. `project.config.ts` の `meta` を書き換える
2. `docs/product-brief.md` と `docs/mvp-scope.md` を記入する
3. LP（`src/app/page.tsx`）を差し替える
4. サンプル機能が不要なら削除: notes（`src/features/notes`, `src/app/(protected)/dashboard`, migration 0003, `src/schemas/note.ts`）/ admin（`modules.admin: false` + `src/features/admin`, `src/app/(protected)/admin`）
5. `docs/implementation-plan.md` の Phase 0 チェックリストを消化する

## ディレクトリ構成

```
src/app          ルーティングと画面（(auth) / (protected) / api/auth）
src/auth         Auth.js 設定・ロール・ガード・プロフィール同期
src/features     機能単位のコード（queries / actions / components）
src/lib/supabase Supabase クライアント（server / browser / admin）+ DB 型
src/actions      Server Action 共通ラッパー
src/schemas      Zod スキーマ
src/components   共有 UI
supabase/        config.toml と migrations
docs/            プロダクト・技術文書（decisions/ = ADR）
project.config.ts 構成の単一情報源（Optional modules のフラグ管理）
```
