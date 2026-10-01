"use client";

import { useRef, useState } from "react";

/**
 * 本文をクリップボードへコピーする。
 *
 * navigator.clipboard は secure context 限定で、localhost と https では使えるが
 * LAN 越しの http://192.168.x.x では undefined になる。スマホから実機確認したときに
 * 黙って無反応になるのを避けるため textarea + execCommand へフォールバックする。
 */
async function writeToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // フォールバックへ進む
  }

  try {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}

/**
 * label は「何をコピーするか」でボタンごとに変える（本文 / 共有リンク）。
 * 既定値は本文コピー用。文字でもアイコンでもよく、カードではアイコンを渡している
 * （読み上げ用の名前は title が担うので、アイコンのときも aria-label は付く）。
 */
export function CopyButton({
  text,
  className,
  label = "コピー",
  copiedLabel = "コピー済",
  title = "本文をコピー",
  onCopied,
}: {
  text: string;
  className?: string;
  label?: React.ReactNode;
  copiedLabel?: React.ReactNode;
  title?: string;
  /** クリップボードへの書き込みが成功したときだけ呼ばれる */
  onCopied?: () => void;
}) {
  const [status, setStatus] = useState<"idle" | "copied" | "failed">("idle");

  const resetTimer = useRef<number | undefined>(undefined);
  const showFor = (next: "copied" | "failed") => {
    setStatus(next);
    window.clearTimeout(resetTimer.current);
    resetTimer.current = window.setTimeout(() => setStatus("idle"), 1800);
  };

  /**
   * 押した瞬間に「コピーしました」を出し、書き込みの完了は待たない。
   * clipboard.writeText はメインスレッドが混んでいると解決が遅れ、モバイルでは
   * 押してから表示まで 2 秒ほどかかっていた。失敗はまれなので、失敗したときだけ表示を差し替える。
   */
  const handleClick = async () => {
    showFor("copied");
    const ok = await writeToClipboard(text);
    if (ok) onCopied?.();
    else showFor("failed");
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        title={title}
        aria-label={title}
        className={className}
      >
        {status === "copied" ? copiedLabel : label}
      </button>
      <span aria-live="polite" className="sr-only">
        {status === "copied" ? "コピーしました" : status === "failed" ? "コピーできませんでした" : ""}
      </span>
      {/*
        結果を画面中央に出す。ボタン自身のラベルが変わるだけだと、
        カードのアイコンボタンでは指の下に隠れて気づけない。
        読み上げは上の live region が担うので、こちらは aria-hidden にする
        （同じ文言を二度読ませない）。
        <dialog> の中から使われることもあるが、fixed は top layer の中でも
        ビューポート基準に効くので、共有ダイアログからでも中央に出る。
      */}
      {status === "idle" ? null : (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 z-50 grid place-items-center"
        >
          <p className="toast-pop rounded-lg bg-[var(--foreground)] px-4 py-2 text-sm font-medium text-[var(--card)] shadow-lg">
            {status === "copied" ? "コピーに成功しました" : "コピーできませんでした"}
          </p>
        </div>
      )}
    </>
  );
}
