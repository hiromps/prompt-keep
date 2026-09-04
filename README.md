# prompt-keep

よく使う AI プロンプトを Google Keep 風のカードで貯めて、タグと検索ですぐ見つけ、
ワンクリックでコピーするためのプロンプト管理。自分のサーバー / Vercel に立てて使う。

**MIT ライセンスです。** フォーク・改変・商用利用のいずれも自由に行えます
（[LICENSE](LICENSE) 参照）。

> **A self-hosted prompt manager with a Google Keep–style UI.**
> Save the AI prompts you reuse as cards, find them by tag or full-text search,
> and copy one to the clipboard in a single click. Pin, archive, and a restorable
> trash are included. Next.js App Router + Auth.js (Google OAuth) + Supabase
> Postgres. The UI and docs are in Japanese. MIT licensed — fork it freely.

[hiromps/nextjs-mvp-starter](https://github.com/hiromps/nextjs-mvp-starter) を土台にしている。

## できること

- プロンプトをカードとして保存（タイトルは任意。本文だけでも保存できる）
- タグ付けと、サイドバーのタグからの絞り込み
- タイトル・本文・タグを横断する検索（全角/半角の表記ゆれを吸収）
- 本文のワンクリックコピー
- ピン留め / アーカイブ / ゴミ箱（論理削除・復元・完全削除）
- カードのタイトルや本文をクリックすると中央のモーダルで編集
- 1件のプロンプトをリンクと QR コードで共有（受け取った人はログイン不要で閲覧・コピー、共有はいつでも停止）

**できないこと**: チーム利用・権限分け・共同編集、プロンプトの変数展開、AI API の呼び出し。
1人1アカウントで自分のプロンプトだけを見る設計です
（[docs/mvp-scope.md](docs/mvp-scope.md) にスコープ外の一覧と理由があります）。

## 技術構成

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

> **ポートは 543xx ではなく 544xx を使う。** 他の Supabase プロジェクトと同時に立ち上げても
> 衝突しないよう `supabase/config.toml` で API 54421 / DB 54422 / Studio 54423 へずらしている。

### 3. 環境変数

```bash
cp .env.example .env.local
```

`.env.local` を編集:

| 変数 | 値 |
|---|---|
| `SUPABASE_URL` | `http://127.0.0.1:54421` |
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

http://localhost:3000 → 「Googleで始める」でログイン → /profile と /prompts が動けばセットアップ完了。

### 6. 管理者にする（任意）

```bash
docker exec supabase_db_prompt-keep psql -U postgres \
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

## 主な画面

| パス | 内容 |
|---|---|
| `/prompts` | 通常ビュー。クイック入力・検索・タグ絞り込み（`?tag=`） |
| `/prompts/archive` | アーカイブしたプロンプト |
| `/prompts/trash` | ゴミ箱（復元 / 完全削除）。自動削除はしない |
| `/profile` | 表示名の変更 |
| `/admin` | スターター由来のロールゲート検証サンプル |

設計判断は [`docs/decisions/0005-prompt-data-model.md`](docs/decisions/0005-prompt-data-model.md)
（タグ配列と3状態モデル）と
[`docs/decisions/0006-service-role-grants.md`](docs/decisions/0006-service-role-grants.md)
（public への明示 GRANT）を参照。

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

## ライセンス

[MIT](LICENSE)。フォークして自分用に立てるのも、改変して再配布するのも自由です。
利用にあたって連絡や表示義務はありません（MIT の条件に従ってください）。

## 貢献

個人プロジェクトのため、機能追加の Issue / PR に必ず対応できるとは限りません。
バグ報告は歓迎します。フォークして自分の使い方に合わせて改造するのが一番早いと思います。

作業を引き継ぐときは、まず [CLAUDE.md](CLAUDE.md)（AI・開発者向けの作業ルール）と
[docs/decisions/](docs/decisions/)（なぜそうなっているかの記録）を読んでください。
