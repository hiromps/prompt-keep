# 0004: Core / Optional module の境界

- 日付: 2026-07-11
- 状態: 採用

## 背景
スターターに機能を積みすぎると、新規プロジェクトごとに「削る作業」が発生し、再利用性が下がる。

## 決定
**Core（常に含む）**: App Router / TypeScript strict / Tailwind / Auth.js（Google OAuth・保護ルート・ロール）/ Supabase migrations + 型生成 / Zod / 型安全な環境変数 / 共通エラー形式 / safe-action ラッパー / ログ / 基本画面（LP・signin・profile・dashboard・エラー系）/ Vitest / Playwright / GitHub Actions / docs テンプレート。

**Optional modules（必要時のみ追加）**: admin / organizations / multi-tenant / payments / email / file upload / realtime / AI / analytics / audit logs / search / i18n。
`project.config.ts` の `modules` でフラグ管理し、コードは該当 feature を追加した時にのみ書く（フラグ先行で空実装を作らない）。

例外: **admin はロールゲートの検証サンプルとして最小実装（/admin の一覧のみ）を含める**。不要なら `modules.admin: false` にして `src/app/(protected)/admin` と `src/features/admin` を削除する。

## 理由
- YAGNI。決済や組織管理はプロダクトごとに要件が違いすぎて、事前実装が無駄になる
- ただし「ロールによる認可」だけは全プロダクト共通の骨格なので Core に置く

## 影響
- 新モジュール追加時は `modules` にフラグ追加 → `src/features/<module>` に実装 → 必要なら migration 追加、の順で行う
