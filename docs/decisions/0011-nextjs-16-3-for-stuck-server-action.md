# 0011: 本番ビルドでカード操作後に一覧が止まる不具合は、アプリで回避せず Next.js 16.3 へ上げて直す

- 日付: 2026-10-01
- 状態: 採用
- 関連: [0008](0008-prompts-layout-owns-data.md) / [0010](0010-close-saves-and-outside-click.md)

## 背景

本番ビルド（`pnpm build && pnpm start`）で、カードのピン留め / ピン留め解除を数回繰り返すと、
**DB は更新されているのに一覧が古いまま止まり、そのカードのボタンがすべて disabled のまま戻らない**。
`pnpm dev` では起きない。

ボタンの disabled は `prompt-card.tsx` の `useTransition` の `isPending`。Server Action は
`startTransition` の中で呼ばれ、`revalidatePath("/prompts", "layout")` を伴うので、Next は応答の
RSC で router の state を置き換える（`x-action-revalidated: 1` → `FreshnessPolicy.RefreshAll`）。
この置き換えの描画がコミットされないと、同じ transition に乗っている `isPending` も false に戻らない。

## 調べたこと

Postgres + PostgREST を立てた本番ビルドに対し、Playwright で同じカードのピン留めを切り替え続け、
8 秒以内に表示が追従してボタンが押せるようになるかを数えた。

| 条件 | 結果 |
|---|---|
| Next 16.2.10（変更前） | 3 回中 3 回停止（1〜4 回目の切り替えで） |
| サイドバーの `prefetch={true}` を `false` に | 3 回中 3 回停止 |
| `PromptsAutoRefresh`（`router.refresh()` のポーリング）を外す | 3 回中 3 回停止 |
| `revalidatePath(..., "layout")` を `"page"` に | 3 回中 3 回停止 |
| Next 16.2.12（16.2 系の最新） | 3 回中 3 回停止 |
| Next 16.3.0 / 16.3.4 | 2 回ずつ、12 回の切り替えすべて追従 |
| **Next 16.3.8（16.3 系の最新）** | **30 回 × 10 セット、20 回 × 5 セット、12 回 × 3 セットすべて追従** |

止まったときの中身（16.2.12 の `app-router-instance.js` に計装して確認）:

- Server Action は **破棄されず**、action queue の先頭として正常に settle し、新しい state で `setState` まで届いている
- 止まった回にも追加の RSC 取得は飛んでいない。描画に要るデータは Server Action の応答だけで揃っている
- POST の `net::ERR_ABORTED` は**成功した回でも毎回**出る（応答の残りを読まずに閉じているだけ）ので原因ではない。
  その後に大量に出る再プリフェッチの中断も、`prefetch={true}` を外しても停止が起きるので原因ではない
- サーバー（RSC は数十 ms で返る）と DB に詰まりは無い。応答は Cookie を書いていない

つまり router の state 更新は React に渡っているのに、その transition の描画がサスペンドしたまま
再開されない。これは Next.js の
[vercel/next.js#98303「Server Action update never commits: a transition lane stays suspended and is never pinged」](https://github.com/vercel/next.js/issues/98303)
と同じ症状である（本番ビルドだけ・確率的・POST は 200・`loading.js` の下に async で再サスペンドするレイアウト・
`revalidatePath` で RefreshAll 経路）。同 issue では 16.3.0 に入った変更
（[#95391](https://github.com/vercel/next.js/pull/95391) など）で大きく減り、16.3.4 でまれに残り、
16.4 canary で解消したと報告されている。#95391 自体は「破棄された action が queue を進めてしまう」修正で、
今回の計装では action の破棄は起きていなかったので、この 1 本だけで直ったとは言えない。
16.2 → 16.3 の間のどの変更で直ったかは特定していない。

## 決定

- **`next` と `eslint-config-next` を 16.3.8 に上げる**。アプリのコードは変えない
- アプリ側の回避策は入れない

## 理由

- 再現手順で 16.2 系は毎回止まり、16.3.8 では 400 回以上の切り替えで一度も止まらなかった
- 止まっているのは router の state（＝一覧の中身）そのものなので、アプリ側でボタンの disabled だけを
  自前の状態に移しても、**ボタンが押せるようになるだけで一覧は古いまま**になる（`isPending` は症状の見え方にすぎない）。
  不整合を隠す回避策は入れない
- 16.3 は同じメジャーのマイナー更新で、`pnpm check` と `pnpm test:e2e` は変更なしで通る。peerDependencies の React 19.2 もそのまま

## 却下した代替案

- **`useTransition` をやめ、disabled を自前の state で持つ**: 上記の通り、一覧が追従しない問題が残る
- **Server Action の後に `router.refresh()` を足す**: 止まっている transition の後ろに積まれるだけで、
  止まった描画を再開させる保証が無い。原因を直さずに経路を増やす
- **16.2.12 に留める**: 16.2 系の最新でも再現した
- **16.4 canary**: issue では 16.4 canary で 0 件とあるが、canary を本番に入れる理由になるほどの差は今回の再現で見えていない

## 影響

- issue の報告では 16.3.4 でまれ（約 2%）に残る。今回の環境では 16.3.8 で一度も再現しなかったが、
  **ゼロとは言い切れない**。再発したら、16.4 以降への更新をまず試す
- 再確認するときは本番ビルドで行う（`pnpm dev` では再現しない）。Playwright で同じカードのピン留めを
  10 回以上切り替え、毎回「ラベルが反転する」「ボタンが押せる状態に戻る」ことを見る。
  ログインは `docs/implementation-status.md`「認証が要る画面を Playwright で確かめるとき」の Cookie 偽造で足りる
