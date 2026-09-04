"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import QRCode from "qrcode";
import { createAuthAction } from "@/actions/safe-action";
import {
  createPromptSchema,
  updatePromptSchema,
  promptIdSchema,
  promptFlagSchema,
} from "@/schemas/prompt";
import { createAdminClient } from "@/lib/supabase/admin";
import { getRequestOrigin } from "@/lib/origin";
import { AppError } from "@/lib/errors";
import type { Database } from "@/lib/supabase/database.types";

type PromptPatch = Database["public"]["Tables"]["prompts"]["Update"];

/** 一覧はこの1ルートに集約されているので、更新後はここだけ再検証すればよい。 */
const PROMPTS_PATH = "/prompts";

function revalidatePrompts() {
  // 通常 / アーカイブ / ゴミ箱は同じセグメント配下なので layout ごと再検証する
  revalidatePath(PROMPTS_PATH, "layout");
}

/**
 * 所有権を必ず伴う更新。
 *
 * 状態変更アクションが6本あり、どれか1本で .eq("owner_id", ...) を書き忘れると
 * 他人の行を触れてしまう（アプリは service_role で接続するため RLS は素通りする）。
 * 経路をこの関数1つに絞ることで、書き忘れを構造的に不可能にする。
 */
async function updateOwnedPrompt(
  id: string,
  ownerId: string,
  patch: PromptPatch,
  failureMessage: string,
): Promise<{ id: string }> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("prompts")
    .update(patch)
    .eq("id", id)
    .eq("owner_id", ownerId)
    .select("id")
    .maybeSingle();

  if (error) {
    throw new AppError("INTERNAL", failureMessage, { cause: error });
  }
  if (!data) {
    // 存在しない or 他人のプロンプト。情報を漏らさないため同一メッセージにする
    throw new AppError("NOT_FOUND", "プロンプトが見つかりません");
  }
  return { id: data.id };
}

export const createPrompt = createAuthAction(
  "prompts.create",
  createPromptSchema,
  async (input, { user }) => {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("prompts")
      .insert({
        owner_id: user.id,
        title: input.title,
        body: input.body,
        tags: input.tags,
      })
      .select("id")
      .single();

    if (error) {
      throw new AppError("INTERNAL", "プロンプトの作成に失敗しました", { cause: error });
    }

    revalidatePrompts();
    return { id: data.id };
  },
);

export const updatePrompt = createAuthAction(
  "prompts.update",
  updatePromptSchema,
  async (input, { user }) => {
    const result = await updateOwnedPrompt(
      input.id,
      user.id,
      { title: input.title, body: input.body, tags: input.tags },
      "プロンプトの更新に失敗しました",
    );
    revalidatePrompts();
    return result;
  },
);

/** ピン留めの設定/解除。反転ではなく「これから何になるか」を受け取る。 */
export const setPromptPinned = createAuthAction(
  "prompts.setPinned",
  promptFlagSchema,
  async (input, { user }) => {
    const result = await updateOwnedPrompt(
      input.id,
      user.id,
      { is_pinned: input.value },
      "ピン留めの変更に失敗しました",
    );
    revalidatePrompts();
    return result;
  },
);

/** アーカイブ / アーカイブ解除。Keep と同じくアーカイブ時はピン留めを外す。 */
export const setPromptArchived = createAuthAction(
  "prompts.setArchived",
  promptFlagSchema,
  async (input, { user }) => {
    const patch = input.value
      ? { archived_at: new Date().toISOString(), is_pinned: false }
      : { archived_at: null };
    const result = await updateOwnedPrompt(
      input.id,
      user.id,
      patch,
      "アーカイブの変更に失敗しました",
    );
    revalidatePrompts();
    return result;
  },
);

/** ゴミ箱へ入れる。archived_at は消さないので、復元すると元の場所へ戻る。 */
export const trashPrompt = createAuthAction(
  "prompts.trash",
  promptIdSchema,
  async (input, { user }) => {
    const result = await updateOwnedPrompt(
      input.id,
      user.id,
      { deleted_at: new Date().toISOString(), is_pinned: false },
      "ゴミ箱への移動に失敗しました",
    );
    revalidatePrompts();
    return result;
  },
);

/** ゴミ箱から戻す。deleted_at を消すだけで、アーカイブ由来ならアーカイブへ戻る。 */
export const restorePrompt = createAuthAction(
  "prompts.restore",
  promptIdSchema,
  async (input, { user }) => {
    const result = await updateOwnedPrompt(
      input.id,
      user.id,
      { deleted_at: null },
      "復元に失敗しました",
    );
    revalidatePrompts();
    return result;
  },
);

/** 完全削除。ゴミ箱に入っている行だけを対象にする（生きている行は NOT_FOUND）。 */
export const purgePrompt = createAuthAction(
  "prompts.purge",
  promptIdSchema,
  async (input, { user }) => {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("prompts")
      .delete()
      .eq("id", input.id)
      .eq("owner_id", user.id)
      .not("deleted_at", "is", null)
      .select("id")
      .maybeSingle();

    if (error) {
      throw new AppError("INTERNAL", "完全削除に失敗しました", { cause: error });
    }
    if (!data) {
      throw new AppError("NOT_FOUND", "プロンプトが見つかりません");
    }

    revalidatePrompts();
    return { id: data.id };
  },
);

// ---------------------------------------------------------------------------
// 共有リンク
// ---------------------------------------------------------------------------

/** 共有リンクの結果。ダイアログはこれだけで QR とリンクを描ける。 */
export type ShareLink = {
  id: string;
  token: string;
  url: string;
  /** QR コードの PNG data URL。サーバーで作るのでクライアントに QR ライブラリを積まない。 */
  qr: string;
};

/**
 * 共有トークンを発行する。
 *
 * 24バイトの乱数（base64url で32文字）。このリンクはログインなしで開けるので、
 * 推測不可能性がそのままアクセス制御になる。連番や短縮 ID にはしない。
 */
function mintShareToken(): string {
  return randomBytes(24).toString("base64url");
}

async function buildShareLink(promptId: string, token: string): Promise<ShareLink> {
  const url = `${await getRequestOrigin()}/s/${token}`;
  // errorCorrectionLevel M は汚れ・反射に対する余裕と密度のバランス。
  // margin 1 は仕様上の最小 quiet zone より狭いが、白背景のカード上に置くため読める。
  const qr = await QRCode.toDataURL(url, { width: 512, margin: 1, errorCorrectionLevel: "M" });
  return { id: promptId, token, url, qr };
}

/**
 * このプロンプトの所有者であることを確認する。
 *
 * prompt_shares は owner_id を持たないので、共有系のアクションは
 * 必ず先にここを通す。通さないと他人の prompt_id を投げるだけで
 * 他人のプロンプトに公開リンクを発行できてしまう。
 */
async function assertPromptOwner(promptId: string, ownerId: string): Promise<void> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("prompts")
    .select("id")
    .eq("id", promptId)
    .eq("owner_id", ownerId)
    .maybeSingle();

  if (error) {
    throw new AppError("INTERNAL", "プロンプトの確認に失敗しました", { cause: error });
  }
  if (!data) {
    throw new AppError("NOT_FOUND", "プロンプトが見つかりません");
  }
}

/** 有効な共有トークンを引く（無ければ null）。 */
async function findActiveToken(promptId: string): Promise<string | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("prompt_shares")
    .select("token")
    .eq("prompt_id", promptId)
    .is("revoked_at", null)
    .maybeSingle();

  if (error) {
    throw new AppError("INTERNAL", "共有リンクの取得に失敗しました", { cause: error });
  }
  return data?.token ?? null;
}

/**
 * 共有リンクを発行する（発行済みならそれを返す＝冪等）。
 *
 * ダイアログを開くたびに呼ぶので、既に共有中のときは新しいリンクを作らない。
 * 配ったリンクが押すたびに変わると、どれが生きているのか分からなくなる。
 */
export const sharePrompt = createAuthAction(
  "prompts.share",
  promptIdSchema,
  async (input, { user }) => {
    await assertPromptOwner(input.id, user.id);

    const existing = await findActiveToken(input.id);
    if (existing) return buildShareLink(input.id, existing);

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("prompt_shares")
      .insert({ prompt_id: input.id, token: mintShareToken() })
      .select("token")
      .single();

    if (error) {
      // 別タブから同時に押されたとき、部分ユニーク制約（有効な共有は1本まで）で
      // 弾かれる。相手が作った方を返せばよいので、取り直して成功にする。
      const raced = await findActiveToken(input.id);
      if (raced) return buildShareLink(input.id, raced);
      throw new AppError("INTERNAL", "共有リンクの発行に失敗しました", { cause: error });
    }

    revalidatePrompts();
    return buildShareLink(input.id, data.token);
  },
);

/**
 * 共有を停止する。行は消さず revoked_at を立てるだけ。
 * 再共有すると新しい token になるので、止めたリンクが復活することはない。
 */
export const unsharePrompt = createAuthAction(
  "prompts.unshare",
  promptIdSchema,
  async (input, { user }) => {
    // ゴミ箱の中でも停止できるようにしたいので、ここでは生死を問わない
    await assertPromptOwner(input.id, user.id);

    const supabase = createAdminClient();
    const { error } = await supabase
      .from("prompt_shares")
      .update({ revoked_at: new Date().toISOString() })
      .eq("prompt_id", input.id)
      .is("revoked_at", null);

    if (error) {
      throw new AppError("INTERNAL", "共有の停止に失敗しました", { cause: error });
    }

    // 既に停止済みでも成功にする（連打や別タブからの停止でエラーを出さない）
    revalidatePrompts();
    return { id: input.id };
  },
);
