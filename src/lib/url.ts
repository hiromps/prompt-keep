/**
 * searchParams の値を単一文字列へ正規化する。
 * Next.js は同名クエリが複数あると string[] を返すため、素朴な string 前提はランタイムエラーになる。
 */
export function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * アプリ内パスとして安全な値のみ通す（オープンリダイレクト防止）。
 * - "/" 始まりのみ許可
 * - "//" と "/\"（ブラウザが // に正規化する）はプロトコル相対 URL になり得るため拒否
 */
export function safeInternalPath(path: string | undefined): string | null {
  if (!path) return null;
  if (!/^\/(?![/\\])/.test(path)) return null;
  return path;
}
