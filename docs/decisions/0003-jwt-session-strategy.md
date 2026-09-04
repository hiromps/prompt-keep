# 0003: セッションは JWT 方式（database 方式へ切替可能）

- 日付: 2026-07-11
- 状態: 採用

## 背景
Auth.js はアダプター使用時、既定で database セッションになる。JWT と database にはトレードオフがある。

## 決定
- 初期構成は `session: { strategy: "jwt" }` を明示する
- JWT には `uid`（Auth.js ユーザーID）と `role` のみを載せる
- `next_auth.sessions` テーブルは migration に含めておき、将来 database 方式へ切り替えられるようにする

## 理由
- JWT はセッション取得のたびに DB を叩かず、MVP の規模ではシンプルで速い
- ロールは UI 出し分け用に JWT に載せるが、管理者操作の実行時は DB を再確認する（requireAdmin）。これにより JWT の古さ（ロール剥奪の遅延反映）を実害から切り離す

## 切替手順（database 方式へ）
1. `src/auth/index.ts` の `strategy` を `"database"` に変更
2. jwt コールバックを削除し、session コールバックを `({ session, user })` ベースへ変更（role は profiles から取得）
3. `project.config.ts` の `auth.sessionStrategy` を更新
4. 即時失効・同時セッション管理が要件になったときに行う

## 影響
- サインアウトの即時失効はできない（JWT の有効期限まで）。強制失効が要件なら database 方式へ
