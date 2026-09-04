"use client";

import { useEffect } from "react";

/**
 * Service Worker を登録する。ホーム画面へのインストールに必要
 * （Chrome はマニフェストに加えて fetch を扱う SW があることを条件にしている）。
 *
 * 開発中は登録しない。dev サーバーの更新を SW が挟むと、
 * 直したはずの画面が古いまま出る事故につながるため。
 */
export function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    // 登録の失敗でアプリを止めない（PWA はあくまで付加機能）
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);

  return null;
}
