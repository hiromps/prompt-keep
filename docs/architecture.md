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
1. **読み取り**: Server Component → `requireSessionForPage()`（JWT のみ）→ `Promise.all(resolvePageAccount(), features/<x>/queries.ts)`（admin client + 所有者スコープ）。
   状態確認とデータ取得は互いに依存しないので並べて待つ。他に待つものが無い単純なページは `requirePageUser()` 一発でもよい
2. **書き込み**: Client form → `features/<x>/actions.ts`（`createAuthAction` = auth + Zod + 共通エラー）→ `revalidatePath`
3. **同じデータの別ビュー**（`/prompts` 配下）: 共有 `layout.tsx` が取得し、`page.tsx` は URL と正確な callbackUrl のためだけに置く（[ADR 0008](decisions/0008-prompts-layout-owns-data.md)）

`getSessionUser` と `profiles` の状態照会は React `cache()` で包んであり、同じリクエスト内なら
root layout の `SiteHeader`・レイアウト・ページが何度呼んでも 1 回しか走らない。

### 共有ページの例外: `/s/[token]` は認証しない
共有リンクだけは `(protected)` の外にあり、`requireUser` を通らない。
不変条件は [auth-and-permissions.md](auth-and-permissions.md) の
「唯一の未認証データ経路」に集約している。

読み込み中表示（`loading.tsx`）を `src/app` 直下ではなく `src/app/(protected)` に
置いているのはこのため。ルート直下に置くと全ルートが Suspense 境界に包まれ、
データ取得より先にシェルが flush されるので、`notFound()` を呼んでも
**HTTP ステータスが 200 のまま**になる（実測で確認）。

### prompts の例外: データはレイアウトが持ち、ビューはクライアントが決める
`src/app/(protected)/prompts/layout.tsx` が所有者の全行を1クエリで取得し、
`PromptsWorkspace`（Client）へ渡す。通常 / アーカイブ / ゴミ箱 は
`useSelectedLayoutSegment()`、タグは `useSearchParams()` でクライアント側が絞り込む。
検索も読み込み済みの行に対するクライアント側フィルタで、キー入力ごとのサーバー往復を避けている。
そのため盤面より内側（カード・クイック入力）は `"use client"` になる。

クライアント遷移では出発地と行き先が共有するレイアウトより下しか再描画されないので、
ビューの切り替えでサーバーに戻らない。3つの `page.tsx` は URL を存在させ、未ログイン時に
正確な callbackUrl で `/signin` へ飛ばすためだけにあり、`null` を返す。
3ビューのリンクは `prefetch={true}`（動的ページでも中身を事前取得）、通常ビュー内のタグ切り替えは
`pushState`（通信ゼロ）。理由と却下案は [ADR 0008](decisions/0008-prompts-layout-owns-data.md)。

レイアウトが Cookie / DB を読むと `(protected)/loading.tsx` は効かない（レイアウトの描画が終わるまで
遷移が止まる）ので、データ待ちはレイアウト内の `<Suspense>` に閉じ込めて、領域に入るときだけ
スピナーを出している。

ビューの絞り込みで DB を叩き分けないのは、サイドバーのタグ件数とクライアント検索が
常に全件を前提にできるようにするため（ビューごとに絞ると、アーカイブ画面でタグ件数がずれる）。

レイアウトに置いても古くならない: 全アクションが `revalidatePath("/prompts", "layout")` を呼び、
その応答でレイアウトごと再描画される。`router.refresh()` も共有レイアウトを含めて再取得する。

### 端末をまたいだ反映は router.refresh() のポーリング
スマホで追加したプロンプトを PC 側でリロードなしに見せるため、
`PromptsAutoRefresh` がタブの表示中だけ 20 秒間隔で `router.refresh()` を呼ぶ。
タブが隠れている間は止め、戻ってきた瞬間は間隔を待たずに即時再取得する
（「スマホで足して PC に戻る」が実際の使い方なので、ここが一番効く）。

`router.refresh()` は Server Component だけを再実行するので、入力途中の本文や
開いている編集モーダル、検索文字列といったクライアント state は保持される。

Supabase Realtime を直接購読していないのは、認証が Auth.js で Supabase Auth では
ないため。ブラウザから購読するには Supabase 用の JWT を別途発行し、その claim を
参照する RLS ポリシーを足す必要があり、[0002](decisions/0002-server-only-data-access-rls-as-defense.md)
の「クライアントに DB を触らせない」方針を崩すことになる。

### サイドバーは画面幅で形が変わる
- md 以上: 画面左端に常設。ハンバーガーで「幅広（288px）↔ アイコンだけのレール（72px）」
- md 未満: 画面に覆いかぶさるドロワー。ハンバーガーで開き、項目選択・背景タップ・Esc で閉じる

`AppShellProvider` が状態を2つ持つのは、画面幅で初期値が違うため
（デスクトップのレールは開いた状態、モバイルのドロワーは閉じた状態が既定）。
1つの状態を使い回すと両立しない。ハンバーガーも JS で画面幅を判定せず、
ボタンを2つ置いて CSS で出し分ける（判定するとサーバー描画とずれてハイドレーションが警告を出す）。

### PWA
`src/app/manifest.ts` が `/manifest.webmanifest` を生成し、`public/sw.js` を
`ServiceWorker`（`src/components/service-worker.tsx`）が本番でのみ登録する。
開発中に登録しないのは、dev サーバーの更新を SW が挟むと直したはずの画面が古いまま出るため。

**SW はページや API の応答を一切キャッシュしない。** ログイン後の内容を保存すると、
別アカウントや古い状態がそのまま出る危険があるため。保持するのは
オフライン時に出す静的ページ `public/offline.html` 1枚だけで、
画面遷移が失敗したときにそれを返す。

### ログアウトの置き場所
ヘッダー右上は Google アカウントのプロフィール画像（`UserAvatar`、無ければ頭文字）で、
押すと `/profile` へ行く。ログアウトはサイドバー（レール / ドロワー）の一番下と、
サイドバーの無い画面から辿り着けるようプロフィール画面の末尾に置く。
どちらも `src/auth/actions.ts` の `signOutAction`（Server Action）を `<form action>` で呼ぶ。
画像は `*.googleusercontent.com` から来るので `next.config.ts` の `images.remotePatterns` で許可している。

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
