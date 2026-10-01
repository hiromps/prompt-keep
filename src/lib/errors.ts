/**
 * アプリ共通のエラー形式。
 * Server Action / Route Handler はこの形式でエラーを返し、
 * 生の例外メッセージ（DB エラー等）をクライアントへ漏らさない。
 */
export const ERROR_CODES = [
  "UNAUTHORIZED", // 未ログイン
  "FORBIDDEN", // 権限・所有権なし
  "NOT_FOUND",
  "VALIDATION",
  "CONFLICT",
  "INTERNAL",
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

export class AppError extends Error {
  readonly code: ErrorCode;

  constructor(code: ErrorCode, message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "AppError";
    this.code = code;
  }
}

export type ActionError = {
  code: ErrorCode;
  message: string;
  /** Zod バリデーション失敗時のフィールド別エラー */
  fieldErrors?: Record<string, string[]>;
};

export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: ActionError };

export function actionError<T>(
  code: ErrorCode,
  message: string,
  fieldErrors?: Record<string, string[]>,
): ActionResult<T> {
  return { ok: false, error: { code, message, fieldErrors } };
}

/**
 * クライアントから Server Action を呼ぶ。通信が切れている等で呼び出し自体が失敗した
 * （例外になった）ときは、共通形式のエラーに直して返す。
 *
 * 例外のまま useTransition の startTransition の中で投げると最寄りの error boundary まで飛び、
 * 画面ごと（書きかけの入力ごと）エラー画面に置き換わってしまう。
 */
export async function callAction<T>(
  action: () => Promise<ActionResult<T>>,
): Promise<ActionResult<T>> {
  try {
    return await action();
  } catch {
    return actionError(
      "INTERNAL",
      "サーバーに接続できませんでした。通信状態を確認して、もう一度お試しください",
    );
  }
}
