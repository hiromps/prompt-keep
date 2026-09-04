# 0005: プロンプトのデータモデル（タグ配列と3状態）

- 日付: 2026-09-04
- 状態: 採用

## 背景
Google Keep 風のプロンプト管理として、1ユーザーが自分のプロンプトをタグ付け・ピン留め・
アーカイブ・ゴミ箱で整理する。スターターの `notes` サンプル（所有データのテンプレート）を
土台にするが、Keep 相当の状態管理をどう表すかを決める必要があった。

## 決定

### タグは `text[]` 1列で持つ（`labels` テーブルを作らない）
`prompts.tags text[] NOT NULL DEFAULT '{}'` + GIN インデックス。サイドバーのタグ一覧と件数は
読み込んだ行から `tagCounts()`（`src/features/prompts/model.ts`）で導出する。

表記ゆれ（全角/半角・大文字小文字）は NFKC + 小文字化した文字列で同一視し、
表示ラベルには最初に現れた表記を使う（`foldForMatch()`、`src/schemas/prompt.ts`）。

### 状態は3つで、`deleted_at` が `archived_at` より優先される
| ビュー | 条件 |
|---|---|
| 通常 | `deleted_at IS NULL AND archived_at IS NULL` |
| アーカイブ | `deleted_at IS NULL AND archived_at IS NOT NULL` |
| ゴミ箱 | `deleted_at IS NOT NULL` |

- ゴミ箱へ入れても `archived_at` は消さない。復元は `deleted_at = NULL` の1列更新だけで、
  アーカイブから来たものはアーカイブへ戻る。
- アーカイブ時とゴミ箱行き時に `is_pinned` を false にする（Keep と同じ挙動）。
- **自動削除はしない**。このスタックに cron が無いため、ゴミ箱は手動で「完全に削除」
  するまで残り続ける。UI で「N日後に削除されます」と書かないこと。

### ピン/アーカイブは「反転」ではなく目標状態を送る
Server Action は `value=true|false` を受け取る（`promptFlagSchema`）。
Supabase JS では `SET is_pinned = NOT is_pinned` を1クエリで書けず、読んでから書く方式は
連打で自分自身と競合するため。目標状態なら何度押しても結果が同じになる。

## 理由
- 単一ユーザー・単一テーブルで完結し、タグの追加・削除が1行の UPDATE で済む
- ラベルの改名・色付けといった「ラベルを実体として管理する機能」は要求に含まれていない
- 復元先を記憶するために別列を足すより、`archived_at` を消さないほうが列も分岐も少ない

## 影響（受け入れた代償）
- **空のタグは存在できない。** 最後の1件が消えるとサイドバーからタグも消える
- **タグの改名は全行スキャン**になる（`array_replace` を UPDATE で流す）。
  Keep の「ラベルの編集」に相当する機能を作るなら、そこが `labels` テーブルへの移行点
- タグ件数は「通常ビューの行」だけを数える。アーカイブ/ゴミ箱の分は含めない

## 関連
- 権限は RLS ではなく DAL 側で担保する（[0002](0002-server-only-data-access-rls-as-defense.md)）。
  アプリは service_role で接続し RLS を素通りするため、状態変更は
  `updateOwnedPrompt()` 1本に集約して `.eq("owner_id", …)` の書き忘れを構造的に防いでいる
