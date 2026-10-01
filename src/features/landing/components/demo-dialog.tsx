"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { useBackdropClick } from "@/components/outside-click";

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

  // 背景のクリックで閉じる。本文を選択しながら外へ出て離したときは閉じない
  // （判定の理由は src/components/outside-click.ts）
  const backdrop = useBackdropClick(() => ref.current?.close());

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      {...backdrop}
      aria-label={label}
      className="m-auto w-[min(92vw,34rem)] rounded-xl border border-[var(--lp-line)] bg-[var(--lp-surface)] p-0 text-[var(--lp-ink)] shadow-2xl backdrop:bg-black/50"
    >
      <div className="flex max-h-[85vh] flex-col p-4">{children}</div>
    </dialog>
  );
}
