"use server";

import { z } from "zod";
import { createPublicAction } from "@/actions/safe-action";
import { createAdminClient } from "@/lib/supabase/admin";
import { AppError } from "@/lib/errors";
import { isShareToken } from "@/schemas/prompt";

const shareTokenSchema = z.object({
  token: z.string().refine(isShareToken, "共有トークンが不正です"),
});

/**
 * ★ログインなしで DB に書く唯一の経路（docs/decisions/0009）★
 *
 * 共有ページ（/s/<token>）で受け取った人がコピーしたときに呼ばれ、
 * そのプロンプトのコピー数を 1 増やす。加算の条件（有効な共有・ゴミ箱でない）は
 * DB 関数 increment_shared_copy が持ち、該当しなければ黙って何もしない。
 * 結果は返さない——停止済みトークンの存在確認に使わせないため。
 *
 * 同じブラウザからの連打は呼び出し側（ShareCopyButton）が localStorage で抑える。
 * サーバー側にレート制限は無い（水増しは MVP として許容。ADR 0009 §4）。
 */
export const recordShareCopy = createPublicAction(
  "recordShareCopy",
  shareTokenSchema,
  async ({ token }) => {
    const supabase = createAdminClient();
    const { error } = await supabase.rpc("increment_shared_copy", { p_token: token });
    if (error) {
      throw new AppError("INTERNAL", "コピー数の記録に失敗しました", { cause: error });
    }
    return null;
  },
);
