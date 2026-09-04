"use client";

import { useMemo, useRef, useState } from "react";
import { PromptCard } from "@/features/prompts/components/prompt-card";
import { matchesQuery, type Prompt, type PromptView } from "@/features/prompts/model";

const EMPTY_MESSAGE: Record<PromptView, string> = {
  active: "まだプロンプトがありません。上の入力欄から追加してください。",
  archived: "アーカイブしたプロンプトはありません。",
  trashed: "ゴミ箱は空です。",
};

/**
 * 検索ボックス + カードのマソンリーグリッド。
 *
 * 検索は読み込み済みの行に対するクライアント側フィルタ。個人利用の件数では
 * サーバー往復や全文検索インデックスは不要で、キー入力ごとに即座に絞り込める。
 * 検索範囲は表示中のビューのみ（Keep は全体を検索するが、ここでは意図的に変えている）。
 */
export function PromptBoard({ prompts, view }: { prompts: Prompt[]; view: PromptView }) {
  // 入力欄に見えている文字列と、実際に絞り込みへ使う文字列を分ける。
  // IME 変換中は query を更新しないので、ローマ字の途中経過で一覧がちらつかない。
  const [input, setInput] = useState("");
  const [query, setQuery] = useState("");
  const composing = useRef(false);

  const visible = useMemo(
    () => prompts.filter((p) => matchesQuery(p, query)),
    [prompts, query],
  );

  return (
    <div>
      <div className="sticky top-0 z-10 -mx-1 bg-[var(--background)] px-1 pb-3">
        <input
          type="search"
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            if (!composing.current) setQuery(e.target.value);
          }}
          onCompositionStart={() => {
            composing.current = true;
          }}
          onCompositionEnd={(e) => {
            composing.current = false;
            setQuery(e.currentTarget.value);
          }}
          placeholder="検索"
          aria-label="プロンプトを検索"
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-4 py-2 text-sm outline-none placeholder:text-[var(--muted)] focus:border-[var(--accent)]"
        />
      </div>

      {visible.length === 0 ? (
        <p className="rounded-lg border border-dashed border-[var(--border)] p-10 text-center text-sm text-[var(--muted)]">
          {query ? "一致するプロンプトはありません。" : EMPTY_MESSAGE[view]}
        </p>
      ) : (
        // CSS カラムによるマソンリー。列方向（上→下→次の列）に流れる点は Keep と異なるが、
        // JS ライブラリなしで高さのばらつきを吸収できる。
        // カード側の break-inside-avoid / inline-block w-full が無いと列をまたいで割れる。
        <div className="columns-1 gap-4 sm:columns-2 lg:columns-3 xl:columns-4">
          {visible.map((prompt) => (
            <PromptCard key={prompt.id} prompt={prompt} view={view} />
          ))}
        </div>
      )}
    </div>
  );
}
