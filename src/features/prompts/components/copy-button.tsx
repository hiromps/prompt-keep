"use client";

import { useState } from "react";

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

export function CopyButton({ text, className }: { text: string; className?: string }) {
  const [status, setStatus] = useState<"idle" | "copied" | "failed">("idle");

  const handleClick = async () => {
    const ok = await writeToClipboard(text);
    setStatus(ok ? "copied" : "failed");
    window.setTimeout(() => setStatus("idle"), 1800);
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        title="本文をコピー"
        aria-label="本文をコピー"
        className={className}
      >
        {status === "copied" ? "コピー済" : "コピー"}
      </button>
      <span aria-live="polite" className="sr-only">
        {status === "copied" ? "コピーしました" : status === "failed" ? "コピーできませんでした" : ""}
      </span>
    </>
  );
}
