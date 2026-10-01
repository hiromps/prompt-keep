"use client";

import { useId, useMemo } from "react";
import { Archive, Lightbulb, Search, Trash2, type LucideIcon } from "lucide-react";
import { PromptCard } from "@/features/prompts/components/prompt-card";
import { useAppShell } from "@/components/app-shell";
import { matchesQuery, type Prompt, type PromptView } from "@/features/prompts/model";

const EMPTY: Record<PromptView, { message: string; Icon: LucideIcon }> = {
  active: { message: "まだプロンプトがありません。上の入力欄から追加してください。", Icon: Lightbulb },
  archived: { message: "アーカイブしたプロンプトはありません。", Icon: Archive },
  trashed: { message: "ゴミ箱は空です。", Icon: Trash2 },
};

/**
 * カードのマソンリーグリッド。
 *
 * 検索文字列はヘッダーの入力欄が持ち、AppShell のコンテキスト経由で受け取る。
 * 絞り込みは読み込み済みの行に対するクライアント側処理で、サーバー往復は無い。
 * 検索範囲は表示中のビューのみ（Keep は全体を検索するが、ここでは意図的に変えている）。
 *
 * ピン留めがあるときは「ピン留め」と「その他」に分けて、ピン留めを上段に並べる（Keep と同じ）。
 * 1 つの段組みに混ぜると、列方向に流れるのでピン留めが 1 列目に縦に積まれ、
 * 「上に固定されている」ように見えない。
 */
export function PromptBoard({ prompts, view }: { prompts: Prompt[]; view: PromptView }) {
  const { query } = useAppShell();
  const pinnedHeading = useId();
  const othersHeading = useId();

  const visible = useMemo(
    () => prompts.filter((p) => matchesQuery(p, query)),
    [prompts, query],
  );

  // ピン留めが意味を持つのは通常ビューだけ（アーカイブ / ゴミ箱へ移すと外れる）
  const pinned = useMemo(
    () => (view === "active" ? visible.filter((p) => p.is_pinned) : []),
    [visible, view],
  );
  const others = useMemo(
    () => (pinned.length > 0 ? visible.filter((p) => !p.is_pinned) : visible),
    [visible, pinned],
  );

  if (visible.length === 0) {
    const { message, Icon } = query
      ? { message: "一致するプロンプトはありません。", Icon: Search }
      : EMPTY[view];
    return (
      <div className="flex flex-col items-center gap-4 px-4 py-20 text-center text-sm text-[var(--muted)]">
        <Icon className="size-20 text-[var(--border)]" strokeWidth={1.25} aria-hidden="true" />
        <p>{message}</p>
      </div>
    );
  }

  if (pinned.length === 0) return <CardGrid prompts={others} view={view} />;

  return (
    <div className="space-y-6">
      <section aria-labelledby={pinnedHeading}>
        <h2 id={pinnedHeading} className={sectionHeading}>
          ピン留め
        </h2>
        <CardGrid prompts={pinned} view={view} />
      </section>
      {others.length > 0 ? (
        <section aria-labelledby={othersHeading}>
          <h2 id={othersHeading} className={sectionHeading}>
            その他
          </h2>
          <CardGrid prompts={others} view={view} />
        </section>
      ) : null}
    </div>
  );
}

const sectionHeading = "mb-2 px-1 text-[11px] font-medium tracking-wider text-[var(--muted)]";

function CardGrid({ prompts, view }: { prompts: Prompt[]; view: PromptView }) {
  return (
    // CSS カラムによるマソンリー。列方向（上→下→次の列）に流れる点は Keep と異なるが、
    // JS ライブラリなしで高さのばらつきを吸収できる。
    // カードは必ずブロックレベルにすること。inline-block にすると Chrome が
    // カラム間で改ページせず、全カードが1列目に積み上がる（実測で確認済み）。
    // カード自体が列をまたいで割れないよう break-inside-avoid も必要。
    // 狭い画面では最小でも2列（Keep と同じく、スマホでも一覧性を優先する）。
    // sm 以上は列数ではなくカード幅（13rem 前後）で段数を決める。列数を画面幅で決めると、
    // サイドバーを開いた md〜xl ではカードが 140〜180px まで細くなり、本文が細切れになる。
    <div className="columns-2 gap-3 sm:columns-[13rem] sm:gap-4">
      {prompts.map((prompt) => (
        <PromptCard key={prompt.id} prompt={prompt} view={view} />
      ))}
    </div>
  );
}
