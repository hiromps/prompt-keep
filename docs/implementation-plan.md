# Implementation Plan

- **目的**: MVP をフェーズ分けし、着手順と依存関係を明確にする。
- **対象読者**: 開発者本人・AIアシスタント（タスク分解の起点）。
- **記入方法**: mvp-scope.md 確定後に記入。進捗は implementation-status.md に書き、ここは計画のみ更新する。

---

## フェーズ構成テンプレート

### Phase 0: スターター適用（済ませてから機能開発に入る）
- [ ] `project.config.ts` の meta を書き換え
- [ ] docs/product-brief.md, mvp-scope.md を記入
- [ ] LP（`src/app/page.tsx`）の文言をプロダクトに合わせる
- [ ] 不要なサンプル（notes / admin）を削除 or 置換
- [ ] Google OAuth クレデンシャル設定・ログイン動作確認

### Phase 1: コアデータモデル
- [ ] 主要テーブルの migration 作成（data-model.md のパターンに従う）
- [ ] `pnpm db:types` で型生成
- [ ] features/<機能>/queries.ts + actions.ts + schemas

### Phase 2: 主要画面
- [ ] （画面ごとに列挙）

### Phase 3: リリース準備
- [ ] Vercel プロジェクト作成・環境変数設定（service role key は Encrypted）
- [ ] Supabase 本番プロジェクトへ `supabase db push`
- [ ] Google OAuth の本番リダイレクト URI 追加
- [ ] E2E・`pnpm check` 通過

## 並行作業の指針
- migration → 型生成 → queries/actions は直列
- 画面同士は並行可。schemas と components も並行可
