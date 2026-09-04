import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { AppError } from "@/lib/errors";

vi.mock("@/auth/guards", () => ({
  requireUser: vi.fn(),
}));

import { requireUser } from "@/auth/guards";
import { createAuthAction } from "@/actions/safe-action";

const mockedRequireUser = vi.mocked(requireUser);

function formDataOf(entries: Record<string, string>) {
  const fd = new FormData();
  for (const [key, value] of Object.entries(entries)) fd.set(key, value);
  return fd;
}

const schema = z.object({ title: z.string().min(1, "必須です") });

describe("createAuthAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedRequireUser.mockResolvedValue({ id: "user-1", role: "user" });
  });

  it("認証済み + 妥当な入力ならハンドラの結果を返す", async () => {
    const action = createAuthAction("test", schema, async (input, ctx) => ({
      echoed: input.title,
      userId: ctx.user.id,
    }));
    const result = await action(null, formDataOf({ title: "hello" }));
    expect(result).toEqual({ ok: true, data: { echoed: "hello", userId: "user-1" } });
  });

  it("未ログインなら UNAUTHORIZED を返す", async () => {
    mockedRequireUser.mockRejectedValue(new AppError("UNAUTHORIZED", "ログインが必要です"));
    const handler = vi.fn();
    const action = createAuthAction("test", schema, handler);
    const result = await action(null, formDataOf({ title: "hello" }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("UNAUTHORIZED");
    expect(handler).not.toHaveBeenCalled();
  });

  it("バリデーション失敗なら fieldErrors を返し、ハンドラを呼ばない", async () => {
    const handler = vi.fn();
    const action = createAuthAction("test", schema, handler);
    const result = await action(null, formDataOf({ title: "" }));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("VALIDATION");
      expect(result.error.fieldErrors?.title?.[0]).toBe("必須です");
    }
    expect(handler).not.toHaveBeenCalled();
  });

  it("ハンドラの AppError はコードを保って返す", async () => {
    const action = createAuthAction("test", schema, async () => {
      throw new AppError("NOT_FOUND", "見つかりません");
    });
    const result = await action(null, formDataOf({ title: "x" }));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("NOT_FOUND");
      expect(result.error.message).toBe("見つかりません");
    }
  });

  it("同名キーの複数値を配列として schema に渡し、$ACTION_ 内部キーは除外する", async () => {
    const multiSchema = z.object({
      title: z.string(),
      tags: z.array(z.string()),
    });
    const action = createAuthAction("test", multiSchema, async (input) => input);
    const fd = new FormData();
    fd.set("title", "t");
    fd.append("tags", "a");
    fd.append("tags", "b");
    fd.set("$ACTION_ID_abc", "internal");
    const result = await action(null, fd);
    expect(result).toEqual({ ok: true, data: { title: "t", tags: ["a", "b"] } });
  });

  it("想定外の例外は INTERNAL に丸め、内部メッセージを漏らさない", async () => {
    const action = createAuthAction("test", schema, async () => {
      throw new Error('connection to database "postgres" failed');
    });
    const result = await action(null, formDataOf({ title: "x" }));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("INTERNAL");
      expect(result.error.message).not.toContain("postgres");
    }
  });
});
