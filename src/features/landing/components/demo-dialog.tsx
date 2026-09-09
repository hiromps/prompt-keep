"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * LP デモ用のモーダル。本物の編集・共有ダイアログと同じく
 * ネイティブ <dialog>.showModal() を使う（フォーカストラップ・Esc・
 * 背景の不活性化がブラウザ側で効くため）。
 */
export function DemoDialog({
  label,
  onClose,
  children,
}: {
  label: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    ref.current?.showModal();
  }, []);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        // 背景（dialog 自身）のクリックだけを閉じる操作として拾う
        if (e.target === ref.current) ref.current?.close();
      }}
      aria-label={label}
      className="m-auto w-[min(92vw,34rem)] rounded-xl border border-[var(--lp-line)] bg-[var(--lp-surface)] p-0 text-[var(--lp-ink)] shadow-2xl backdrop:bg-black/50"
    >
      <div className="flex max-h-[85vh] flex-col p-4">{children}</div>
    </dialog>
  );
}
