import {
  useEffect,
  useEffectEvent,
  useRef,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from "react";

/*
 * 「外側をクリックしたら閉じる」の判定（編集モーダルの背景・クイック入力の外側）。
 *
 * click イベントは「ボタンを押した要素と離した要素の共通の祖先」に届く。
 * 本文をドラッグで選択しながら外へ出て離すと、共通の祖先（モーダルなら <dialog> 自身）が
 * target になるので、click の target だけを見ると外側のクリックと区別できない。
 * PC で文字を選択している途中にカーソルがモーダルの外へ出ただけで閉じ、書きかけが
 * 消えていたのはこのため。押した場所と離した場所の両方が外側のときだけ外側のクリックとみなす。
 */

/**
 * <dialog>.showModal() の背景クリック用。返り値を dialog 要素にそのまま展開する。
 * 背景（::backdrop）の上で起きたイベントは dialog 自身を target にして届く。
 */
export function useBackdropClick(onBackdropClick: () => void) {
  const pressedOnBackdrop = useRef(false);

  return {
    onPointerDown: (e: ReactPointerEvent<HTMLElement>) => {
      pressedOnBackdrop.current = e.target === e.currentTarget;
    },
    onPointerUp: (e: ReactPointerEvent<HTMLElement>) => {
      // 背景で押しても、中身の上で離したならクリックとはみなさない
      if (e.target !== e.currentTarget) pressedOnBackdrop.current = false;
    },
    onClick: (e: ReactMouseEvent<HTMLElement>) => {
      const pressed = pressedOnBackdrop.current;
      pressedOnBackdrop.current = false;
      // detail > 1 はダブルクリックの 2 回目。カードをダブルクリックすると 1 回目で
      // モーダルが開き、2 回目が背景に落ちて開いた直後に閉じてしまうので拾わない
      if (pressed && e.target === e.currentTarget && e.detail <= 1) onBackdropClick();
    },
  };
}

/**
 * ref の要素の外側をクリック（タップ）したら onOutside を呼ぶ。
 * Keep のクイック入力のように「外を触ったら閉じる」ための判定で、enabled の間だけ監視する。
 *
 * - 押した場所と離した場所の両方が外側のときだけ反応する
 * - 外側で文字をドラッグ選択しただけなら反応しない（カードの本文を選んでコピーする操作など）
 * - タッチでスクロールしただけなら click が来ないので反応しない
 */
export function useClickOutside(
  ref: RefObject<HTMLElement | null>,
  onOutside: () => void,
  enabled: boolean,
) {
  const fire = useEffectEvent(onOutside);

  useEffect(() => {
    if (!enabled) return;
    let pressedOutside = false;
    const isOutside = (target: EventTarget | null) =>
      !(target instanceof Node && ref.current?.contains(target));

    const onPointerDown = (e: PointerEvent) => {
      pressedOutside = isOutside(e.target);
    };
    const onClick = (e: MouseEvent) => {
      const pressed = pressedOutside;
      pressedOutside = false;
      if (!pressed || !isOutside(e.target)) return;
      const selection = window.getSelection();
      if (selection && !selection.isCollapsed) return;
      fire();
    };

    // 捕捉フェーズで見る。途中の要素が伝播を止めても取りこぼさない
    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("click", onClick, true);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("click", onClick, true);
    };
  }, [enabled, ref]);
}
