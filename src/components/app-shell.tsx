"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

/**
 * ヘッダーとページ本体で共有する UI 状態。
 *
 * 検索ボックスはヘッダー（root layout）、絞り込む対象の一覧はページ側にあり、
 * 親子関係が無いので props では渡せない。サイドバーの開閉もハンバーガーが
 * ヘッダー、サイドバー本体がページ側なので同じ事情になる。
 * root layout にこの Provider を置いて両方から参照する。
 *
 * URL のクエリにしないのは、1文字打つたびに Server Component が再実行され、
 * サーバー往復が発生してしまうため（検索は読み込み済みの行に対して行う）。
 */
type AppShellState = {
  query: string;
  setQuery: (value: string) => void;
  sidebarOpen: boolean;
  toggleSidebar: () => void;
};

const AppShellContext = createContext<AppShellState | null>(null);

export function AppShellProvider({ children }: { children: ReactNode }) {
  const [query, setQuery] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <AppShellContext.Provider
      value={{
        query,
        setQuery,
        sidebarOpen,
        toggleSidebar: () => setSidebarOpen((open) => !open),
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
