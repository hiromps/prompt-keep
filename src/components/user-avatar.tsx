import Image from "next/image";

/**
 * Google アカウントのプロフィール画像。無ければ名前（無ければメール）の頭文字を丸で出す。
 *
 * 画像は Google の CDN（*.googleusercontent.com）から来るので next.config.ts の
 * images.remotePatterns で許可している。alt は空にし、意味は親（リンク）の aria-label に持たせる。
 */
export function UserAvatar({
  image,
  name,
  email,
  size = 32,
}: {
  image?: string | null;
  name?: string | null;
  email?: string | null;
  size?: number;
}) {
  const initial = (name || email || "?").trim().charAt(0).toUpperCase();

  if (image) {
    return (
      <Image
        src={image}
        alt=""
        width={size}
        height={size}
        className="rounded-full bg-[var(--chip)] object-cover"
        // 縦横を固定して、読み込み前にレイアウトが動かないようにする
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      className="inline-flex items-center justify-center rounded-full bg-[var(--chip)] text-sm font-medium text-[var(--muted-strong)]"
      style={{ width: size, height: size }}
    >
      {initial}
    </span>
  );
}
