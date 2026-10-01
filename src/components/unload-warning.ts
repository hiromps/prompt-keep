import { useEffect } from "react";

/**
 * 未保存の入力があるあいだ、タブを閉じる・再読み込みする前にブラウザの確認を出す。
 *
 * アプリ内の遷移（Link）では beforeunload は飛ばない。そちらは各コンポーネントが
 * 閉じる操作やアンマウントの時点で保存する。
 */
export function useUnloadWarning(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      // 古い Safari は returnValue を入れないと確認を出さない
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [enabled]);
}
