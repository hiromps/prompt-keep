# 0008. 同じデータの別ビューは共有レイアウトが取得し、ページは URL のためだけに置く

- ステータス: 採用
- 日付: 2026-09-04
- 関連: [0002](0002-server-only-data-access-rls-as-defense.md) / [0003](0003-jwt-session-strategy.md) / [0005](0005-prompt-data-model.md)

## 背景

「ページ切り替えが遅い」。通常 / アーカイブ / ゴミ箱 / タグ絞り込みの行き来で、
毎回スピナーに置き換わってから盤面が戻ってくるまで待たされていた。

調べると、遅さは通信環境ではなく構造から来ていた。

- 4種類の表示は**所有者の全行をクライアント側で絞り込んでいるだけ**（[0005](0005-prompt-data-model.md) の設計）なのに、
  ページごとに Server Component が `auth()` → `profiles` の状態確認 → `prompts` 全件取得を**直列**に走らせていた
- `(protected)/loading.tsx` が `(protected)` 直下にあり `prompts/` にレイアウトが無いため、
  ビューを切り替えるたびに Suspense 境界が盤面を捨ててスピナーを出していた
- `next/link` の既定プリフェッチは「動的ルートは最寄りの `loading.tsx` まで」なので、
  事前に届いていたのはスピナーだけだった
- クライアント Router Cache の `staleTimes.dynamic` は既定 0 で、行ったり来たりも毎回サーバー往復だった

Next.js（16.2）はクライアント遷移で**出発地と行き先が共有するレイアウトより下だけ**を再描画する
（`docs/01-app/02-guides/instant-navigation.md`、サーバー側は `Next-Router-State-Tree` で
一致したセグメントの描画を省く）。逆に言えば、データを共有レイアウトに持たせれば
ビュー切り替えでサーバー往復そのものが消える。

## 決定

### 1. `prompts/layout.tsx` が全件を1回取得し、ビューとタグはクライアントが URL から決める

- `src/app/(protected)/prompts/layout.tsx` が `getSessionUser()` → `Promise.all(状態確認, 全件取得)` → `PromptsWorkspace`（Client）
- `PromptsWorkspace` が `useSelectedLayoutSegment()`（ビュー）と `useSearchParams()`（タグ）で絞り込む
- 3つの `page.tsx` は **JWT だけ確認して `null` を返す**。URL を存在させ、
  未ログイン時に正確な `callbackUrl` で `/signin` へ飛ばすためだけにある
- 停止中アカウントの `/unauthorized` はレイアウトが担う。**1リクエストで redirect するセグメントは高々1つ**
  （page は「セッション無し」、layout は「セッションあり かつ 停止中」でしか redirect しない）

### 2. レイアウトのデータ待ちは自前の `<Suspense>` に閉じ込める

レイアウトが Cookie / DB を読むと `(protected)/loading.tsx` は効かず、`/profile` などから
「入ってくる」遷移が無表示で待たされる（`loading.md`「Without Cache Components: Navigation blocks
until the layout finishes rendering」）。`getSessionUser()` の後を `<Suspense fallback={<Loading />}>`
で包み、入場時は従来通りスピナーを出す。ビューの切り替えではレイアウトが再描画されないので境界は現れない。

### 3. ビューのリンクは `prefetch={true}`、タグは `pushState`

- 3ビューのリンク（現在地以外）は `prefetch={true}`。動的ページでも全体を事前取得し（`link.md`）、
  クリック時はサーバー往復なし。ページの中身は「JWT を見て null」なので事前取得は極小
- 通常ビュー内のタグ切り替えは `<Link onNavigate>` で既定の遷移を止め `window.history.pushState` する。
  Next の router と同期して `useSearchParams` が更新されるため通信ゼロ（`04-linking-and-navigating.md`）。
  `href` は残すので新しいタブや修飾キー付きクリックは普通のリンクとして動く。
  アーカイブ / ゴミ箱からのタグ選択は通常の遷移（page セグメントだけ取得、レイアウトは走らない）

### 4. 認証まわりの重複と直列を減らす

- `getSessionUser` / `loadAccountState` を React `cache()` で包む（リクエスト内で JWT 復号と `profiles` 照会が1回）
- `requireUser` の後半を `resolveAccount(sessionUser)` として切り出し、状態確認とデータ取得を `Promise.all` できるようにする。
  `/profile` `/admin` も同じ形（直列2往復 → 並列1往復分）
- Supabase の admin client はプロセス内シングルトン（service role 固定でユーザーごとの状態を持たない）

## 理由

- 「全件取得 → クライアント絞り込み」という既存設計と最も相性が良く、**サーバー側キャッシュを一切足さずに**
  切り替えを即時にできる。データはユーザー固有で更新が多く、キャッシュの無効化を持ち込むと
  端末間反映（`router.refresh()` ポーリング）と衝突する
- 変更後も書き込みは `requireUser` が毎回 DB で状態を確認する（[0003](0003-jwt-session-strategy.md) の方針は維持）

## 却下した代替案

- **`cacheComponents` + `"use cache"` + `unstable_instant`**: ドキュメントが推す本命だが、
  `router.refresh()` はサーバー側 `use cache` を無効化しない（`use-router.md`）。20秒ポーリングが
  古いキャッシュを返す事故になる。`unstable_instant` は draft で `cacheComponents` 前提。
  データがユーザー固有・更新頻度高のこのアプリでは利点より運用リスクが大きい
- **`experimental.staleTimes`**: experimental。今回の構造変更でビュー切り替えには不要になる
- **Parallel Routes**: スロットは URL を作らない（`parallel-routes.md`）。3ビューは別 URL である必要がある
- **ビュー切り替えも `pushState`**: `usePathname` は更新されるが router の木は変わらず、
  行き先の page セグメント（`metadata.title` 含む）が取り込まれない。ビューは実遷移にする
- **`proxy.ts`（旧 middleware）で未ログインを弾く**: 正確な callbackUrl を1か所で出せるが、
  Auth.js 設定を edge/Node で分ける必要があり変更が広い。page の JWT 確認で足りる

## 影響

- 停止中に切り替えられたアカウントは、ビュー切り替え（レイアウト非再描画）では次の
  `router.refresh()`（最大20秒）まで閲覧が続く。書き込みは即座に拒否される
- 停止中ユーザーの `/unauthorized` は Suspense 内からの redirect になり、HTTP 200 + クライアント置換で届く
  （未ログイン時の `/signin` は従来からこの形。e2e は `waitForURL` で見ている）
- `prefetch={true}` と 20 秒ポーリングの組み合わせで、可視タブあたり 20 秒に小さな RSC 要求が 2 件増える
- レイアウトの説明で「兄弟ページ間の遷移でレイアウトは再描画されないので古いまま残る」としていた
  以前の注記は、`revalidatePath("/prompts", "layout")`（全アクションで実行）と `router.refresh()` が
  レイアウトを更新するため成立しない。今回それを前提に置き換えた
- 検証: `tests/e2e/prompts-navigation.spec.ts`（ログイン済み。スピナーが出ない・page セグメントだけ取得・
  タグ切替は通信ゼロ）
