"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

/**
 * タブが見えている間の再取得間隔。再取得は全件をサーバーで描画し直すので安くない。
 * 以前は 20 秒だったが、モバイルでは開いているだけで通信とメインスレッドを使い続け、
 * 操作が重くなっていた。他の端末の変更はタブ復帰時の再取得でほぼ拾えるので 60 秒にする。
 */
const POLL_MS = 60_000;
/**
 * 直前の再取得からこれより短ければ見送る。focus と visibilitychange は同時に飛ぶことがあり、
 * モバイルではアプリを行き来するたびに復帰が起きるので、タブ復帰（force）もこの間隔は守る。
 */
const MIN_GAP_MS = 10_000;

/**
 * 別の端末で追加・編集したプロンプトを、リロードなしで反映する。
 *
 * router.refresh() は Server Component を再実行して一覧だけを差し替える。
 * クライアント側の state（入力中の本文、開いている編集モーダル、検索文字列）は
 * 保持されるので、書きかけを壊さない。
 *
 * Supabase Realtime を直接購読していないのは、このアプリの認証が Auth.js で
 * Supabase Auth ではないため。ブラウザから購読するには Supabase 用の JWT を
 * 別途発行し、その claim を見る RLS ポリシーを足す必要がある
 * （docs/decisions/0002 の「クライアントへ DB を触らせない」方針を崩すことになる）。
 *
 * 実際の使い方は「スマホで追加 → PC に戻る」なので、フォーカスが戻った瞬間の
 * 再取得がいちばん効く。開きっぱなしの画面のために定期実行も併用する。
 */
export function PromptsAutoRefresh() {
  const router = useRouter();
  const lastRefresh = useRef(0);

  useEffect(() => {
    let timer: number | undefined;

    const refresh = (force = false) => {
      if (document.visibilityState !== "visible") return;
      const now = Date.now();
      // 直前に走ったばかりなら見送る（タブ復帰でも同じ。数秒前に取ったばかりなら新しいものは無い）
      if (now - lastRefresh.current < (force ? MIN_GAP_MS : POLL_MS / 2)) return;
      lastRefresh.current = now;
      router.refresh();
    };

    const stop = () => {
      if (timer !== undefined) window.clearInterval(timer);
      timer = undefined;
    };
    const start = () => {
      stop();
      timer = window.setInterval(() => refresh(), POLL_MS);
    };

    const onVisibility = () => {
      // 隠れている間はサーバーを叩かない（無駄な実行を積み上げない）
      if (document.visibilityState === "visible") {
        refresh(true);
        start();
      } else {
        stop();
      }
    };

    if (document.visibilityState === "visible") start();
    document.addEventListener("visibilitychange", onVisibility);
    // ウィンドウの切り替え（PC で別アプリから戻る）はタブ復帰と同じ扱い
    const onFocus = () => refresh(true);
    window.addEventListener("focus", onFocus);

    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", onFocus);
    };
  }, [router]);

  return null;
}
