"use client";

import { useRef } from "react";
import { usePathname } from "next/navigation";
import { Search, X } from "lucide-react";
import { useAppShell } from "@/components/app-shell";

/**
 * ヘッダーの検索ボックス。プロンプト一覧系のパスでのみ表示する。
 *
 * 入力欄に見えている文字列と、実際に絞り込みへ使う文字列を分ける。
 * IME 変換中は query を更新しないので、ローマ字の途中経過で一覧がちらつかない。
 */
export function HeaderSearch() {
  const pathname = usePathname();
  const { query, setQuery } = useAppShell();
  const composing = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);

  if (!pathname.startsWith("/prompts")) return null;

  return (
    <div className="relative min-w-0 flex-1">
      <Search
        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[var(--muted)]"
        aria-hidden="true"
      />
      <input
        ref={inputRef}
        type="search"
        defaultValue={query}
        onChange={(e) => {
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
        className="w-full rounded-lg bg-[var(--chip)] py-2 pr-9 pl-9 text-sm outline-none placeholder:text-[var(--muted)] focus:bg-[var(--card)] focus:ring-1 focus:ring-[var(--border)]"
      />
      {query ? (
        <button
          type="button"
          onClick={() => {
            setQuery("");
            if (inputRef.current) inputRef.current.value = "";
            inputRef.current?.focus();
          }}
          aria-label="検索をクリア"
          className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 text-[var(--muted)] hover:text-[var(--foreground)]"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      ) : null}
    </div>
  );
}
