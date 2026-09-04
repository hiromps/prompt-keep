# Architecture

- **目的**: システム構成と責任分離を示し、コードを読む前の地図にする。
- **対象読者**: 開発者本人・AIアシスタント。
- **記入方法**: 構成を変えたら（モジュール追加・外部サービス追加）必ず更新する。詳細な判断理由は decisions/ の ADR に書き、ここには現在形の構成だけを書く。

---

## 技術スタック
- Next.js App Router（TypeScript strict / Tailwind CSS / pnpm）
- 認証: Auth.js（NextAuth v5, JWT session, Google OAuth）+ Supabase Adapter
- DB: Supabase PostgreSQL（Supabase Auth は不使用 → ADR 0001）
- 検証: Zod / Vitest / Playwright、CI: GitHub Actions、デプロイ: Vercel

## データフロー原則（ADR 0002）
```
Browser ──(HTML/Server Action)──> Next.js サーバー ──(service role)──> Supabase PostgreSQL
   │                                    │
   └── 直接アクセス禁止（RLS 全拒否） └── auth() で認証・ロール・所有権を検証
```

## ディレクトリ責任
| パス | 責任 |
|---|---|
| `src/app` | ルーティングと画面構成のみ。ロジックは持たない |
| `src/auth` | Auth.js 設定・ロール・ガード・プロフィール同期 |
| `src/features/<name>` | プロジェクト固有機能（queries / actions / components） |
| `src/lib/supabase` | Supabase クライアント（server / browser / admin）と DB 型 |
| `src/actions` | Server Action 共通ラッパー（safe-action） |
| `src/schemas` | Zod スキーマ（入力検証の単一情報源） |
| `src/components` | 共有 UI |
| `supabase/migrations` | DB 変更（手書き直し禁止、常に新規 migration） |
| `docs` | プロダクト・技術文書 |
| `project.config.ts` | プロジェクト構成の単一情報源 |

## リクエスト処理の型
1. **読み取り**: Server Component → `requireUser()` → `features/<x>/queries.ts`（admin client + 所有者スコープ）
2. **書き込み**: Client form → `features/<x>/actions.ts`（`createAuthAction` = auth + Zod + 共通エラー）→ `revalidatePath`

### prompts の例外: 盤面は Client Component
`/prompts` 系の3ページは Server Component のまま所有者の全行を1クエリで取得し、
`PromptsShell`（Server）→ `PromptBoard`（Client）へ渡す。検索は読み込み済みの行に対する
クライアント側フィルタで、キー入力ごとのサーバー往復を避けている。
そのため盤面より内側（カード・クイック入力）は `"use client"` になる。

ビューの絞り込みで DB を叩き分けないのは、サイドバーのタグ件数とクライアント検索が
常に全件を前提にできるようにするため（ビューごとに絞ると、アーカイブ画面でタグ件数がずれる）。

### ヘッダーとページ本体をつなぐ `AppShellProvider`
検索ボックスとハンバーガーは `SiteHeader`（root layout）にあり、絞り込まれる一覧と
サイドバーはページ側にある。親子関係が無く props で渡せないので、
`src/components/app-shell.tsx` の Client Context を root layout に置いて共有する
（検索文字列とサイドバーの開閉状態）。

URL のクエリにしないのは、1文字打つたびに Server Component が再実行されてしまうため。
状態は root layout にあるので、`/prompts` ↔ アーカイブ ↔ ゴミ箱 を行き来しても保たれる
（リロードすると初期値に戻る）。

`main` には横幅の制約を掛けない。プロンプト一覧はサイドバーを画面の左端まで寄せるため、
root layout で中央寄せの max-width を掛けると逃げられなくなる。
幅が必要なページ（LP / プロフィール / 管理など）は各自でコンテナを持つ。

## プロジェクト固有の構成
（外部サービス・キュー・cron 等を追加したらここに記載）
