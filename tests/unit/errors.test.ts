import { describe, expect, it } from "vitest";
import { AppError, actionError, callAction } from "@/lib/errors";

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

describe("callAction", () => {
  it("Server Action の結果をそのまま返す", async () => {
    await expect(callAction(async () => ({ ok: true as const, data: { id: "1" } }))).resolves.toEqual({
      ok: true,
      data: { id: "1" },
    });
    const failure = actionError("NOT_FOUND", "プロンプトが見つかりません");
    await expect(callAction(async () => failure)).resolves.toEqual(failure);
  });

  it("呼び出し自体が失敗（通信断など）したら例外を投げずに共通形式のエラーにする", async () => {
    const result = await callAction(async () => {
      throw new TypeError("Failed to fetch");
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("INTERNAL");
      expect(result.error.message).toContain("サーバーに接続できませんでした");
    }
  });
});
