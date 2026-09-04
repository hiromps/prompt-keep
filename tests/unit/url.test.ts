import { describe, expect, it } from "vitest";
import { firstParam, safeInternalPath } from "@/lib/url";

describe("firstParam", () => {
  it("文字列はそのまま返す", () => {
    expect(firstParam("/dashboard")).toBe("/dashboard");
  });

  it("配列（重複クエリ）は先頭を返す", () => {
    expect(firstParam(["/a", "/b"])).toBe("/a");
  });

  it("undefined は undefined", () => {
    expect(firstParam(undefined)).toBeUndefined();
  });
});

describe("safeInternalPath", () => {
  it("アプリ内パスを通す", () => {
    expect(safeInternalPath("/dashboard")).toBe("/dashboard");
    expect(safeInternalPath("/notes/123?tab=a")).toBe("/notes/123?tab=a");
  });

  it("プロトコル相対 URL（//）を拒否する", () => {
    expect(safeInternalPath("//evil.com")).toBeNull();
  });

  it("バックスラッシュ形式（/\\）を拒否する", () => {
    expect(safeInternalPath("/\\evil.com")).toBeNull();
    expect(safeInternalPath("/\\/evil.com")).toBeNull();
  });

  it("絶対 URL・空文字・undefined を拒否する", () => {
    expect(safeInternalPath("https://evil.com")).toBeNull();
    expect(safeInternalPath("")).toBeNull();
    expect(safeInternalPath(undefined)).toBeNull();
  });
});
