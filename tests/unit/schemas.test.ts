import { describe, expect, it } from "vitest";
import { updateProfileSchema } from "@/schemas/profile";
import { createNoteSchema, deleteNoteSchema } from "@/schemas/note";

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

describe("createNoteSchema", () => {
  it("content 省略時は空文字になる", () => {
    const result = createNoteSchema.safeParse({ title: "メモ" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.content).toBe("");
  });

  it("タイトル必須", () => {
    expect(createNoteSchema.safeParse({ title: "" }).success).toBe(false);
  });
});

describe("deleteNoteSchema", () => {
  it("UUID 以外の id を拒否する", () => {
    expect(deleteNoteSchema.safeParse({ id: "1; DROP TABLE notes;" }).success).toBe(false);
  });

  it("UUID を受け付ける", () => {
    expect(
      deleteNoteSchema.safeParse({ id: "3f2c8e5a-1b2d-4c3e-9f4a-5b6c7d8e9f0a" }).success,
    ).toBe(true);
  });
});
