import Image from "next/image";
import Link from "next/link";
import { Check } from "lucide-react";
import heroShare from "../../../../public/images/hero-share.png";
import { hero } from "@/features/landing/content";
import { focusRing, pillNavy, pillOutline, pillWhite } from "@/features/landing/classes";

/**
 * ファーストビュー。
 *
 * 9:16 の「ポスター」（ネイビー地に見出し・3D イラスト・X 投稿のモック・CTA）が主役。
 * - 狭い画面: ポスターがそのままファーストビュー。文字はポスターの中に重ねる
 * - md 以上: 左に見出しと CTA、右にポスター。ポスター側の文字は消して絵に集中させる
 *
 * h1 と CTA は両方の DOM に書いてあるが、片方は display:none なので
 * アクセシビリティツリーにも Playwright にも 1 つしか見えない。
 */

function Title({ className }: { className: string }) {
  const [first, second] = hero.titleLines;
  const [before, after] = second.split(hero.titleAccent);
  return (
    <h1 className={className}>
      <span className="block whitespace-nowrap">{first}</span>
      <span className="block whitespace-nowrap">
        {before}
        <span className="text-[var(--lp-accent-text)]">{hero.titleAccent}</span>
        {after}
      </span>
    </h1>
  );
}

function Lead({ className }: { className: string }) {
  return (
    <p className={className}>
      {hero.leadLines[0]}
      <br />
      {hero.leadLines[1]}
    </p>
  );
}

function TrustRow({ className }: { className: string }) {
  return (
    <ul className={`flex flex-wrap gap-x-4 gap-y-1 text-xs ${className}`}>
      {hero.trust.map((t) => (
        <li key={t} className="inline-flex items-center gap-1.5">
          <Check size={12} aria-hidden="true" />
          {t}
        </li>
      ))}
    </ul>
  );
}

/** X 投稿のモック。イラストの手前に浮かべる飾りなので aria-hidden */
function MockPost() {
  const p = hero.mockPost;
  return (
    <div
      aria-hidden="true"
      className="w-[170px] rounded-[14px] bg-[var(--lp-surface)] p-3 sm:w-[210px] text-[var(--lp-ink)] shadow-[0_18px_40px_rgba(0,0,0,0.35)]"
    >
      <div className="flex items-center gap-2">
        <span className="size-7 rounded-full bg-[var(--lp-periwinkle)]" />
        <div className="min-w-0 leading-tight">
          <p className="text-[11px] font-bold">{p.name}</p>
          <p className="text-[10px] text-[var(--lp-muted)]">{p.handle}</p>
        </div>
        <svg viewBox="0 0 24 24" width={12} height={12} fill="currentColor" className="ml-auto">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      </div>
      <p className="mt-2 text-[11px] leading-snug">{p.text}</p>
      <p className="mt-1.5 truncate rounded-md bg-[var(--lp-soft-blue)] px-2 py-1 text-[10px] text-[var(--lp-periwinkle)]">
        {p.link}
      </p>
      <p className="mt-1 text-[10px] text-[var(--lp-periwinkle)]">{p.tag}</p>
    </div>
  );
}

export function HeroPoster() {
  return (
    <section className="grid items-center gap-6 md:grid-cols-[1fr_minmax(300px,380px)] md:gap-10 lg:gap-16">
      {/* md 以上の左カラム。狭い画面ではポスター内の文字が代わりをする */}
      <div className="lp-hero-copy hidden md:block">
        <p className="inline-flex items-center gap-2 rounded-full bg-[var(--lp-soft-blue)] px-3 py-1 text-xs font-medium">
          <span aria-hidden="true" className="size-1.5 rounded-full bg-[var(--lp-periwinkle)]" />
          {hero.eyebrow}
        </p>
        <Title className="lp-hero-title mt-5 leading-[1.12] font-bold tracking-[-0.02em]" />
        <Lead className="mt-6 text-base leading-relaxed text-[var(--lp-muted)] lg:text-lg" />
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/signin" className={`${pillNavy} px-6 py-3 text-base`}>
            {hero.primaryCta}
          </Link>
          <Link href="/prompts" className={`${pillOutline} px-6 py-3 text-base`}>
            {hero.secondaryCta}
          </Link>
        </div>
        <TrustRow className="mt-6 text-[var(--lp-muted)]" />
      </div>

      {/* 9:16 のポスター */}
      <div className="lp-poster relative aspect-[9/16] w-full overflow-hidden rounded-[32px] text-[var(--lp-surface)] shadow-[0_30px_80px_-20px_rgba(11,32,49,0.55)]">
        {/* 上: 小さな帯（狭い画面のみ） */}
        <div className="absolute inset-x-0 top-0 flex items-center justify-between px-6 pt-6 md:hidden">
          <span className="lp-navy-muted text-xs font-medium tracking-wide">prompt-keep</span>
          <span className="lp-navy-hold rounded-full px-3 py-1 text-[11px]">{hero.eyebrow}</span>
        </div>

        {/* 見出し（狭い画面のみ） */}
        <div className="absolute inset-x-0 top-[13%] px-6 md:hidden">
          <Title className="lp-poster-title leading-[1.15] font-bold tracking-[-0.02em]" />
        </div>

        {/* 3D イラスト。狭い画面では見出しの下、md 以上では中央よりやや上 */}
        <div className="absolute inset-x-0 top-[34%] flex justify-center md:top-[16%]">
          <div className="w-[72%] translate-x-[6%] min-[360px]:w-[80%] md:w-[86%] md:translate-x-0">
            <Image
              src={heroShare}
              alt={hero.imageAlt}
              priority
              sizes="(min-width: 768px) 330px, 82vw"
              className="h-auto w-full drop-shadow-[0_24px_40px_rgba(0,0,0,0.4)]"
            />
          </div>
        </div>

        {/* 「コピーしました」トースト。受け取る側の体験を 1 つ見せる */}
        <div
          aria-hidden="true"
          className="absolute top-[36%] right-5 inline-flex items-center gap-1.5 rounded-full bg-[var(--lp-surface)] px-3 py-1.5 text-[11px] font-medium text-[var(--lp-ink)] shadow-lg md:top-[18%]"
        >
          <Check size={12} className="text-[var(--lp-green)]" />
          {hero.mockToast}
        </div>

        {/* X 投稿のモック。イラストの左下に重ねる。320px 級ではイラストを隠してしまうので出さない */}
        <div className="absolute bottom-[27%] left-4 hidden min-[360px]:block sm:left-5 md:bottom-[22%]">
          <MockPost />
        </div>

        {/* 下: 説明と CTA（狭い画面のみ）。イラストと重なっても読めるよう下から暗くする */}
        <div className="lp-poster-scrim absolute inset-x-0 bottom-0 px-6 pt-12 pb-6 md:hidden">
          <Lead className="lp-navy-muted text-[13px] leading-relaxed" />
          <div className="mt-4 flex items-center gap-3">
            <Link href="/signin" className={`${pillWhite} px-5 py-2.5`}>
              {hero.primaryCta}
            </Link>
            <Link
              href="/prompts"
              className={`lp-navy-muted text-sm underline underline-offset-4 ${focusRing}`}
            >
              {hero.secondaryCta}
            </Link>
          </div>
          <TrustRow className="lp-navy-muted mt-4" />
        </div>

        {/* 下: md 以上ではキャッチだけ小さく残す */}
        <div className="absolute inset-x-0 bottom-0 hidden px-7 pb-7 md:block">
          <p className="text-2xl leading-snug font-bold">
            ポスト1回で、
            <br />
            タイムラインに届く。
          </p>
          <p className="lp-navy-muted mt-2 text-sm">
            受け取った人はログイン不要。だから、広がる。
          </p>
        </div>
      </div>
    </section>
  );
}
