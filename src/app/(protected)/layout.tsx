/**
 * 保護ルートのグループ。
 *
 * 認可は各ページが requirePageUser("/path") / requirePageAdmin("/path") で行う
 * （callbackUrl 付きリダイレクトにはページ自身のパスが必要なため、layout では行わない）。
 * このグループへページを追加するときは、必ず冒頭でガードを呼ぶこと。
 * Server Action 側は createAuthAction / requireUser が独立して認可する。
 */
export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
