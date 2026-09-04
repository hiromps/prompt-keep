import { describe, expect, it } from "vitest";
import { updateProfileSchema } from "@/schemas/profile";
import {
  createPromptSchema,
  promptIdSchema,
  promptFlagSchema,
  isShareToken,
  normalizeTags,
  MAX_TAGS,
} from "@/schemas/prompt";

describe("updateProfileSchema", () => {
  it("前後の空白をトリムして受け付ける", () => {
    const result = updateProfileSchema.safeParse({ display_name: "  太郎  " });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.display_name).toBe("太郎");
  });

  it("空文字を拒否する", () => {
    expect(updateProfileSchema.safeParse({ display_name: "   " }).success).toBe(false);
  });

  it("50文字超を拒否する", () => {
    expect(updateProfileSchema.safeParse({ display_name: "あ".repeat(51) }).success).toBe(false);
  });
});

describe("normalizeTags", () => {
  it("半角/全角カンマ・読点・空白のどれでも区切れる", () => {
    expect(normalizeTags("要約, 翻訳、コード　レビュー")).toEqual([
      "要約",
      "翻訳",
      "コード",
      "レビュー",
    ]);
  });

  it("空要素を捨てる", () => {
    expect(normalizeTags(" , ,要約,, ")).toEqual(["要約"]);
  });

  it("表記ゆれを同じタグとして重複排除し、最初の表記を残す", () => {
    // 全角英字と半角英字、大文字と小文字は NFKC + 小文字化で同一視する
    expect(normalizeTags("ＧＰＴ,gpt,GPT")).toEqual(["ＧＰＴ"]);
  });

  it("タグ数の上限で打ち切る", () => {
    const many = Array.from({ length: MAX_TAGS + 5 }, (_, i) => `tag${i}`).join(",");
    expect(normalizeTags(many)).toHaveLength(MAX_TAGS);
  });

  it("空文字なら空配列になる", () => {
    expect(normalizeTags("")).toEqual([]);
  });
});

describe("createPromptSchema", () => {
  it("タイトルなし・本文ありで通る", () => {
    const result = createPromptSchema.safeParse({ body: "要約してください" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.title).toBe("");
      expect(result.data.tags).toEqual([]);
    }
  });

  it("タイトルも本文も空なら拒否する", () => {
    expect(createPromptSchema.safeParse({ title: "", body: "  " }).success).toBe(false);
  });

  it("CRLF を LF に正規化する", () => {
    const result = createPromptSchema.safeParse({ body: "一行目\r\n二行目" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.body).toBe("一行目\n二行目");
  });

  it("タグ文字列を配列に変換する", () => {
    const result = createPromptSchema.safeParse({ body: "本文", tags: "要約,翻訳" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.tags).toEqual(["要約", "翻訳"]);
  });
});

describe("promptIdSchema", () => {
  it("UUID 以外の id を拒否する", () => {
    expect(promptIdSchema.safeParse({ id: "1; DROP TABLE prompts;" }).success).toBe(false);
  });

  it("UUID を受け付ける", () => {
    expect(
      promptIdSchema.safeParse({ id: "3f2c8e5a-1b2d-4c3e-9f4a-5b6c7d8e9f0a" }).success,
    ).toBe(true);
  });
});

describe("promptFlagSchema", () => {
  it("文字列の true/false を boolean にする", () => {
    const id = "3f2c8e5a-1b2d-4c3e-9f4a-5b6c7d8e9f0a";
    const on = promptFlagSchema.safeParse({ id, value: "true" });
    const off = promptFlagSchema.safeParse({ id, value: "false" });
    expect(on.success && on.data.value).toBe(true);
    expect(off.success && off.data.value).toBe(false);
  });

  it("true/false 以外を拒否する", () => {
    expect(
      promptFlagSchema.safeParse({
        id: "3f2c8e5a-1b2d-4c3e-9f4a-5b6c7d8e9f0a",
        value: "toggle",
      }).success,
    ).toBe(false);
  });
});

describe("isShareToken", () => {
  it("発行する形式（base64url 32文字）を通す", () => {
    expect(isShareToken("Ab3-_zZ9Ab3-_zZ9Ab3-_zZ9Ab3-_zZ9")).toBe(true);
  });

  it("短すぎる・長すぎるものを拒否する", () => {
    expect(isShareToken("short")).toBe(false);
    expect(isShareToken("a".repeat(65))).toBe(false);
  });

  it("base64url 以外の文字を拒否する（URL からそのまま渡るため）", () => {
    expect(isShareToken("Ab3-_zZ9Ab3-_zZ9Ab3-_zZ9Ab3-_zZ/")).toBe(false);
    expect(isShareToken("Ab3-_zZ9Ab3-_zZ9Ab3-_zZ9Ab3-_zZ%")).toBe(false);
    expect(isShareToken("")).toBe(false);
  });
});
