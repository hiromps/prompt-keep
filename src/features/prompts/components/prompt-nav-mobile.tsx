"use client";

import Link from "next/link";
import { Lightbulb, Archive, Trash2 } from "lucide-react";
import type { PromptView } from "@/features/prompts/model";

const NAV = [
  { view: "active" as const, href: "/prompts", label: "プロンプト", Icon: Lightbulb },
  { view: "archived" as const, href: "/prompts/archive", label: "アーカイブ", Icon: Archive },
  { view: "trashed" as const, href: "/prompts/trash", label: "ゴミ箱", Icon: Trash2 },
];

/**
 * 画面が狭いときのビュー切り替え。
 * サイドバーは md 未満では出さない（横幅を取りすぎるため）ので、その代わりの導線。
 */
export function PromptNavMobile({ view }: { view: PromptView }) {
  return (
    <nav aria-label="プロンプトの絞り込み" className="mb-4 md:hidden">
      <ul className="flex gap-2 overflow-x-auto">
        {NAV.map(({ view: v, href, label, Icon }) => (
          <li key={href}>
            <Link
              href={href}
              aria-current={v === view ? "page" : undefined}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm whitespace-nowrap ${
                v === view
                  ? "bg-[var(--chip-active)] font-medium"
                  : "text-[var(--muted-strong)] hover:bg-[var(--chip)]"
              }`}
            >
              <Icon className="size-4" aria-hidden="true" />
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
