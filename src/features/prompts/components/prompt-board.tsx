"use client";

import { useMemo } from "react";
import { PromptCard } from "@/features/prompts/components/prompt-card";
import { useAppShell } from "@/components/app-shell";
import { matchesQuery, type Prompt, type PromptView } from "@/features/prompts/model";

const EMPTY_MESSAGE: Record<PromptView, string> = {
  active: "まだプロンプトがありません。上の入力欄から追加してください。",
  archived: "アーカイブしたプロンプトはありません。",
  trashed: "ゴミ箱は空です。",
};

/**
 * カードのマソンリーグリッド。
 *
 * 検索文字列はヘッダーの入力欄が持ち、AppShell のコンテキスト経由で受け取る。
 * 絞り込みは読み込み済みの行に対するクライアント側処理で、サーバー往復は無い。
 * 検索範囲は表示中のビューのみ（Keep は全体を検索するが、ここでは意図的に変えている）。
 */
export function PromptBoard({ prompts, view }: { prompts: Prompt[]; view: PromptView }) {
  const { query } = useAppShell();

  const visible = useMemo(
    () => prompts.filter((p) => matchesQuery(p, query)),
    [prompts, query],
  );

  if (visible.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-[var(--border)] p-10 text-center text-sm text-[var(--muted)]">
        {query ? "一致するプロンプトはありません。" : EMPTY_MESSAGE[view]}
      </p>
    );
  }

  return (
    // CSS カラムによるマソンリー。列方向（上→下→次の列）に流れる点は Keep と異なるが、
    // JS ライブラリなしで高さのばらつきを吸収できる。
    // カードは必ずブロックレベルにすること。inline-block にすると Chrome が
    // カラム間で改ページせず、全カードが1列目に積み上がる（実測で確認済み）。
    // カード自体が列をまたいで割れないよう break-inside-avoid も必要。
    <div className="columns-1 gap-4 sm:columns-2 md:columns-3 lg:columns-4 xl:columns-5 2xl:columns-7">
      {visible.map((prompt) => (
        <PromptCard key={prompt.id} prompt={prompt} view={view} />
      ))}
    </div>
  );
}
