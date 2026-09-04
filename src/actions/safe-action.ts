import "server-only";
import { z } from "zod";
import { requireUser, type AuthenticatedUser } from "@/auth/guards";
import { AppError, actionError, type ActionResult } from "@/lib/errors";
import { logger } from "@/lib/logger";

export type ActionContext = {
  user: AuthenticatedUser;
};

/**
 * FormData をプレーンオブジェクトへ変換する。
 * - 同名キーが複数ある場合は配列にする（Object.fromEntries は最後の値以外を黙って捨てるため不可）
 * - React が付与する内部フィールド（$ACTION_*）は除外する
 * - 未チェックの checkbox はキー自体が送信されない点に注意（schema 側で .default() を使う）
 * - <input type="file"> は File オブジェクトのまま渡る（受ける場合は schema 側で instanceof 検証する）
 */
export function formDataToObject(
  formData: FormData,
): Record<string, FormDataEntryValue | FormDataEntryValue[]> {
  const obj: Record<string, FormDataEntryValue | FormDataEntryValue[]> = {};
  for (const key of new Set(formData.keys())) {
    if (key.startsWith("$ACTION_")) continue;
    const values = formData.getAll(key);
    obj[key] = values.length === 1 ? values[0] : values;
  }
  return obj;
}

/**
 * Server Action 共通ラッパー（認証必須 + Zod 検証 + 共通エラー形式）。
 *
 * - auth() で認証を確認し、未ログインは UNAUTHORIZED、停止中アカウントは FORBIDDEN を返す
 * - FormData を schema で検証し、失敗時は fieldErrors を返す
 * - AppError はそのままコードとメッセージを返し、想定外の例外は
 *   詳細をログに残して INTERNAL に丸める（内部情報をクライアントへ漏らさない）
 *
 * useActionState と組み合わせて使う:
 *   const [state, formAction] = useActionState(createNote, null)
 * クライアントから直接呼ぶこともできる:
 *   const result = await createNote(null, formData)
 */
export function createAuthAction<S extends z.ZodType, T>(
  actionName: string,
  schema: S,
  handler: (input: z.output<S>, ctx: ActionContext) => Promise<T>,
) {
  return async function action(
    _prevState: ActionResult<T> | null,
    formData: FormData,
  ): Promise<ActionResult<T>> {
    try {
      const user = await requireUser();

      const parsed = schema.safeParse(formDataToObject(formData));
      if (!parsed.success) {
        const { fieldErrors } = z.flattenError(parsed.error);
        return actionError(
          "VALIDATION",
          "入力内容を確認してください",
          fieldErrors as Record<string, string[]>,
        );
      }

      const data = await handler(parsed.data, { user });
      return { ok: true, data };
    } catch (error) {
      if (error instanceof AppError) {
        return actionError(error.code, error.message);
      }
      logger.error("server action failed", {
        action: actionName,
        error: error instanceof Error ? error.message : String(error),
      });
      return actionError("INTERNAL", "処理に失敗しました。時間をおいて再試行してください");
    }
  };
}
