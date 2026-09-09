"use client";

import { CopyButton } from "@/features/prompts/components/copy-button";
import { recordShareCopy } from "@/features/ranking/actions";

/**
 * 共有ページ（/s/<token>）のコピーボタン。
 * コピーに成功したら、そのブラウザで初めてのときだけコピー数を +1 する
 * （印は localStorage。消せば数え直せるが、それは ADR 0009 で許容している）。
 * 記録の失敗はユーザーに見せない——コピー自体はもう終わっているので、伝えることが無い。
 */
export function ShareCopyButton({
  token,
  text,
  className,
}: {
  token: string;
  text: string;
  className?: string;
}) {
  const record = () => {
    const key = `pk:copied:${token}`;
    try {
      if (localStorage.getItem(key)) return;
      localStorage.setItem(key, String(Date.now()));
    } catch {
      // プライベートモード等で localStorage が使えないときは毎回数える
    }
    const formData = new FormData();
    formData.set("token", token);
    void recordShareCopy(null, formData);
  };

  return <CopyButton text={text} className={className} onCopied={record} />;
}
