# Implementation Status

- **目的**: 「いま何がどこまで動くか」の現在地を1枚で示す。セッションをまたぐ作業の再開点。
- **対象読者**: 開発者本人・AIアシスタント（作業再開時に最初に読む）。
- **記入方法**: 作業を終えるたびに該当行を更新する。日付と検証方法（テスト/手動）を残す。

---

## スターター自体の状態（2026-07-11 時点）

| 項目 | 状態 | 検証方法 |
|---|---|---|
| pnpm install → 起動 | ✅ | `pnpm dev` 起動確認済み |
| Supabase migration 適用 | ✅ | ローカルで3本適用・テーブル/RLS/トリガー/カスケード確認済み |
| 型チェック / Lint / 単体テスト(14件) / production build | ✅ | `pnpm check` |
| E2E（公開ページ・未認証リダイレクト・service key 非露出）9件 | ✅ | `pnpm test:e2e` |
| RLS 防御層（anon 全拒否） | ✅ | REST API へ anon で select/insert → 拒否確認済み |
| next_auth スキーマの API 公開（Adapter 要件） | ✅ | service role で next_auth.users へ挿入確認済み |
| Google ログイン実動作 | ⏳ 手動確認待ち | 下記「手動検証手順」参照。OAuth クレデンシャルが必要 |
| Auth.js ユーザー ⇔ profiles 関連付け | ⏳ 手動確認待ち | DB 直挿入では検証済み。実ログインで最終確認する |

## 手動検証手順（Google ログイン）
1. Google Cloud Console → OAuth クライアント作成（リダイレクト URI: `http://localhost:3000/api/auth/callback/google`）
2. `.env.local` の `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` を設定
3. `pnpm db:start` → `pnpm dev` → http://localhost:3000 → 「Googleで始める」
4. 確認: /profile に表示名が出る・`public.profiles` に行がある・/prompts でプロンプトの作成/編集/コピー/タグ絞り込み/検索/ピン/アーカイブ/ゴミ箱が動く・別 Google アカウントで他人のプロンプトが見えない
5. 管理者確認: `UPDATE public.profiles SET role='admin' WHERE ...` → 再ログイン → /admin が表示される。一般ユーザーは /unauthorized へ

## 2026-07-12 不具合修正（セキュリティ/品質レビュー反映）
- 修正: 重複 callbackUrl での 500（searchParams の string[] 正規化 `src/lib/url.ts`）
- 修正: サインイン系エラー（OAuthAccountNotLinked 等）が /signin で表示されなかった問題
- 修正: suspended ユーザーの強制遮断（requireUser が status/role を毎回 DB 確認 + signIn コールバックで再ログイン拒否）
- 修正: 保護ページの callbackUrl 付きリダイレクト（requirePageUser / requirePageAdmin。(protected)/layout は認可しない設計に変更）
- 修正: note-item のエラー無表示・状態残留・in-flight 競合（useTransition + ローカル状態へ再設計）
- 修正: safe-action の FormData 変換（複数値対応・$ACTION_ 除外）
- 修正: AUTH_SECRET min(32)、callbackUrl のバックスラッシュ拒否、profile-sync リトライのエラー黙殺、
  ヘッダーの管理リンクを modules.admin と連動、E2E の service key 検証を実キー対応 + CI に html レポーター追加

## プロジェクト固有の進捗
（機能開発を始めたらここへ表を追加）
