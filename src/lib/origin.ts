import "server-only";
import { headers } from "next/headers";
import { AppError } from "@/lib/errors";

/**
 * 共有リンクの絶対 URL を組み立てるためのオリジン（例: https://example.com）。
 *
 * 本番URLをハードコードすると、ローカルで発行した QR が本番を指してしまい
 * 「読み取れるのに開けない」という分かりにくい壊れ方をする。実際のリクエストから取る。
 *
 * AUTH_URL / NEXTAUTH_URL が設定されていればそちらを優先する。Host ヘッダは
 * クライアントが自由に名乗れるため、環境変数で固定できるならその方が確実。
 * ただし用途は「発行者本人に見せるリンクの表示」だけで、これが偽装されても
 * 発行される token や DB の内容は変わらない（アクセス制御には使っていない）。
 */
export async function getRequestOrigin(): Promise<string> {
  const configured = process.env.AUTH_URL ?? process.env.NEXTAUTH_URL;
  if (configured) return new URL(configured).origin;

  const headerList = await headers();
  // Vercel など逆プロキシ配下では x-forwarded-* に本来のホストが入る
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host");
  if (!host) {
    throw new AppError("INTERNAL", "共有リンクの URL を組み立てられませんでした");
  }

  const forwardedProto = headerList.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const isLocal = /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(host);
  const protocol = forwardedProto ?? (isLocal ? "http" : "https");

  return `${protocol}://${host}`;
}
