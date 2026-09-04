"use client";

/* eslint-disable @next/next/no-img-element -- QR は data URL。next/image は最適化できず、実寸も固定 */

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { sharePrompt, unsharePrompt, type ShareLink } from "@/features/prompts/actions";
import { CopyButton } from "@/features/prompts/components/copy-button";
import type { Prompt } from "@/features/prompts/model";
import type { ActionError } from "@/lib/errors";

/**
 * 共有リンクと QR コードのダイアログ。
 *
 * 「共有中かどうか」はカードが share_token として持っている。
 * 共有中ならダイアログを開いた時点でリンクを取り直し（発行はしない）、
 * 未共有なら本人が明示的にボタンを押すまで何も公開しない——
 * ダイアログを開いただけで公開状態になるのは事故のもとなので、そこは分けている。
 */
export function PromptShareDialog({
  prompt,
  onClose,
}: {
  prompt: Prompt;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [link, setLink] = useState<ShareLink | null>(null);
  const [error, setError] = useState<ActionError | null>(null);
  const [isPending, startTransition] = useTransition();
  // このダイアログは「共有」を押した後、つまりブラウザ上でしか描かれないので
  // 初回レンダー時点で navigator を見てよい（SSR では sharing=false で null になる）
  const [canNativeShare] = useState(
    () => typeof navigator !== "undefined" && typeof navigator.share === "function",
  );

  /** 発行済みなら取得、未発行なら発行（サーバー側で冪等）。 */
  const requestLink = useCallback(() => {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("id", prompt.id);
      const result = await sharePrompt(null, formData);
      if (result.ok) {
        setLink(result.data);
        setError(null);
      } else {
        setError(result.error);
      }
    });
  }, [prompt.id]);

  // 開いた時点で共有中だったか。発行に成功すると prompt.share_token は途中で
  // 変わるので、その変化でこの効果が再実行されないよう初期値を固定する
  const [initiallyShared] = useState(() => prompt.share_token !== null);

  useEffect(() => {
    dialogRef.current?.showModal();
    // 既に共有中のときだけ、開いた時点でリンクを取りに行く（未共有では何も公開しない）
    if (initiallyShared) requestLink();
  }, [initiallyShared, requestLink]);

  const stopSharing = () => {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("id", prompt.id);
      const result = await unsharePrompt(null, formData);
      if (result.ok) dialogRef.current?.close();
      else setError(result.error);
    });
  };

  const nativeShare = async () => {
    if (!link) return;
    try {
      await navigator.share({ title: prompt.title || "プロンプト", url: link.url });
    } catch {
      // ユーザーがシートを閉じただけでも reject される。何もしない
    }
  };

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      onClick={(e) => {
        // 背景（dialog 自身）のクリックだけを閉じる操作として拾う
        if (e.target === dialogRef.current) dialogRef.current?.close();
      }}
      aria-label="プロンプトを共有"
      className="m-auto w-[min(92vw,26rem)] rounded-xl border border-[var(--border)] bg-[var(--card)] p-0 text-[var(--foreground)] shadow-2xl backdrop:bg-black/50"
    >
      <div className="flex flex-col p-5">
        <h2 className="text-base font-medium">プロンプトを共有</h2>

        {link ? (
          <>
            <p className="mt-1 text-xs text-[var(--muted)]">
              リンクを知っている人なら誰でも閲覧・コピーできます（ログイン不要）。
            </p>

            {/* QR は PNG の data URL。サーバーで生成しているのでクライアントに QR ライブラリは載らない */}
            <img
              src={link.qr}
              alt={`${link.url} の QR コード`}
              width={200}
              height={200}
              className="mx-auto mt-4 h-[200px] w-[200px] rounded-md border border-[var(--border)] bg-white"
            />

            <input
              readOnly
              value={link.url}
              aria-label="共有リンク"
              onFocus={(e) => e.currentTarget.select()}
              className="mt-4 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-xs"
            />

            <div className="mt-3 flex flex-wrap gap-2">
              <CopyButton
                text={link.url}
                label="リンクをコピー"
                copiedLabel="コピーしました"
                title="共有リンクをコピー"
                className="flex-1 rounded-md bg-[var(--foreground)] px-3 py-2 text-sm font-medium text-[var(--card)]"
              />
              {canNativeShare ? (
                <button
                  type="button"
                  onClick={nativeShare}
                  className="rounded-md border border-[var(--border)] px-3 py-2 text-sm"
                >
                  共有…
                </button>
              ) : null}
            </div>

            <button
              type="button"
              onClick={stopSharing}
              disabled={isPending}
              className="mt-4 self-start text-sm text-red-600 hover:underline disabled:opacity-40"
            >
              共有を停止する
            </button>
            <p className="mt-1 text-xs text-[var(--muted)]">
              停止すると、このリンクは開けなくなります。あとで共有し直すと新しいリンクになります。
            </p>
          </>
        ) : (
          <>
            <p className="mt-2 text-sm text-[var(--muted-strong)]">
              共有リンクを作ると、リンクを知っている人なら誰でもこのプロンプトを閲覧・コピーできるようになります（ログイン不要）。
            </p>
            <p className="mt-2 text-xs text-[var(--muted)]">
              QR コードも一緒に発行されます。共有はいつでも停止できます。
            </p>
            <button
              type="button"
              onClick={requestLink}
              disabled={isPending}
              className="mt-4 rounded-md bg-[var(--foreground)] px-4 py-2 text-sm font-medium text-[var(--card)] disabled:opacity-40"
            >
              {isPending ? "作成中…" : "共有リンクを作成"}
            </button>
          </>
        )}

        {error ? (
          <p role="alert" className="mt-3 text-sm text-red-600">
            {error.message}
          </p>
        ) : null}

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            className="rounded px-3 py-1.5 text-sm text-[var(--muted)] hover:bg-[var(--chip)]"
          >
            閉じる
          </button>
        </div>
      </div>
    </dialog>
  );
}
