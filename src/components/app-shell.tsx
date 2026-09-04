"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

/**
 * ヘッダーとページ本体で共有する UI 状態。
 *
 * 検索ボックスとハンバーガーは `SiteHeader`（root layout）、絞り込む一覧と
 * サイドバーはページ側にあり、親子関係が無いので props では渡せない。
 * root layout にこの Provider を置いて両方から参照する。
 *
 * 検索文字列を URL のクエリにしないのは、1文字打つたびに Server Component が
 * 再実行され、サーバー往復が発生してしまうため（検索は読み込み済みの行に対して行う）。
 *
 * サイドバーの状態を2つに分けているのは、画面幅で意味が違うから:
 * - `railExpanded`（md 以上）: 常時表示されるレールが「幅広か、アイコンだけか」
 * - `drawerOpen`（md 未満）: 画面に覆いかぶさるドロワーが「開いているか」
 * 1つの状態を使い回すと、初期値（デスクトップは展開・モバイルは閉）が両立しない。
 */
type AppShellState = {
  query: string;
  setQuery: (value: string) => void;
  railExpanded: boolean;
  toggleRail: () => void;
  drawerOpen: boolean;
  setDrawerOpen: (open: boolean) => void;
};

const AppShellContext = createContext<AppShellState | null>(null);

export function AppShellProvider({ children }: { children: ReactNode }) {
  const [query, setQuery] = useState("");
  const [railExpanded, setRailExpanded] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <AppShellContext.Provider
      value={{
        query,
        setQuery,
        railExpanded,
        toggleRail: () => setRailExpanded((open) => !open),
        drawerOpen,
        setDrawerOpen,
      }}
    >
      {children}
    </AppShellContext.Provider>
  );
}

export function useAppShell(): AppShellState {
  const ctx = useContext(AppShellContext);
  if (!ctx) throw new Error("useAppShell は AppShellProvider の内側でのみ使えます");
  return ctx;
}
