import { describe, expect, it } from "vitest";
import { AppError, actionError } from "@/lib/errors";

describe("AppError", () => {
  it("code と message を保持する", () => {
    const error = new AppError("FORBIDDEN", "権限がありません");
    expect(error.code).toBe("FORBIDDEN");
    expect(error.message).toBe("権限がありません");
    expect(error).toBeInstanceOf(Error);
  });
});

describe("actionError", () => {
  it("共通エラー形式を生成する", () => {
    const result = actionError("VALIDATION", "入力エラー", { title: ["必須です"] });
    expect(result).toEqual({
      ok: false,
      error: {
        code: "VALIDATION",
        message: "入力エラー",
        fieldErrors: { title: ["必須です"] },
      },
    });
  });
});
