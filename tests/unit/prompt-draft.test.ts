import { describe, expect, it } from "vitest";
import {
  EMPTY_DRAFT,
  draftFormData,
  draftTags,
  isBlankDraft,
  isDraftChanged,
  type PromptDraft,
} from "@/features/prompts/model";

const saved = { title: "要約", body: "次の文章を要約して", tags: ["仕事"] };
const draftOf = (patch: Partial<PromptDraft> = {}): PromptDraft => ({
  ...saved,
  pendingTag: "",
  ...patch,
});

describe("draftTags", () => {
  it("打ちかけのタグが無ければ確定済みのタグをそのまま返す", () => {
    expect(draftTags(draftOf())).toEqual(["仕事"]);
    expect(draftTags(draftOf({ pendingTag: "   " }))).toEqual(["仕事"]);
  });

  it("打ちかけのタグを確定済みとして加える（Esc で閉じても消えない）", () => {
    expect(draftTags(draftOf({ pendingTag: "翻訳" }))).toEqual(["仕事", "翻訳"]);
  });

  it("打ちかけが既存のタグと表記ゆれで重なるなら増やさない", () => {
    expect(draftTags(draftOf({ tags: ["AI"], pendingTag: "ａｉ" }))).toEqual(["AI"]);
  });
});

describe("isBlankDraft", () => {
  it("タイトルも本文も空白だけなら保存するものが無い", () => {
    expect(isBlankDraft(EMPTY_DRAFT)).toBe(true);
    expect(isBlankDraft({ ...EMPTY_DRAFT, title: "  ", body: "\n" })).toBe(true);
  });

  it("タグだけでは保存しない（createPromptSchema と同じ基準）", () => {
    expect(isBlankDraft({ ...EMPTY_DRAFT, tags: ["仕事"] })).toBe(true);
  });

  it("タイトルか本文のどちらかがあれば保存する", () => {
    expect(isBlankDraft({ ...EMPTY_DRAFT, title: "見出し" })).toBe(false);
    expect(isBlankDraft({ ...EMPTY_DRAFT, body: "本文" })).toBe(false);
  });
});

describe("isDraftChanged", () => {
  it("開いたときのままなら変更なし（閉じても上書き保存しない）", () => {
    expect(isDraftChanged(draftOf(), saved)).toBe(false);
  });

  it("本文の末尾 1 文字の追加も変更として拾う", () => {
    expect(isDraftChanged(draftOf({ body: `${saved.body}。` }), saved)).toBe(true);
  });

  it("タイトル・タグ・打ちかけのタグの変更を拾う", () => {
    expect(isDraftChanged(draftOf({ title: "要約（改）" }), saved)).toBe(true);
    expect(isDraftChanged(draftOf({ tags: [] }), saved)).toBe(true);
    expect(isDraftChanged(draftOf({ pendingTag: "翻訳" }), saved)).toBe(true);
  });

  it("保存しても結果が変わらない差（タイトル前後の空白・改行コード）は変更なし", () => {
    expect(isDraftChanged(draftOf({ title: "  要約 " }), saved)).toBe(false);
    expect(
      isDraftChanged(draftOf({ body: "1行目\r\n2行目" }), { ...saved, body: "1行目\n2行目" }),
    ).toBe(false);
  });
});

describe("draftFormData", () => {
  it("Server Action の入力形式（タグはカンマ区切りの 1 本）にする", () => {
    const formData = draftFormData(draftOf({ pendingTag: "翻訳" }), "prompt-id");
    expect(formData.get("id")).toBe("prompt-id");
    expect(formData.get("title")).toBe("要約");
    expect(formData.get("body")).toBe("次の文章を要約して");
    expect(formData.get("tags")).toBe("仕事,翻訳");
  });

  it("id を渡さなければ id を含めない（新規作成用）", () => {
    expect(draftFormData(EMPTY_DRAFT).has("id")).toBe(false);
  });
});
