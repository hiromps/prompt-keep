import { redirect } from "next/navigation";
import { getSessionUser } from "@/auth/guards";
import "@/features/landing/landing.css";
import { hero } from "@/features/landing/content";
import { HeroCtaCard } from "@/features/landing/components/hero-cta-card";
import { FeatureGrid } from "@/features/landing/components/feature-grid";
import { InstallPitchCard } from "@/features/landing/components/install-pitch-card";
import { PromptListPreview } from "@/features/landing/components/prompt-list-preview";
import { HowToSteps } from "@/features/landing/components/how-to-steps";
import { FooterCta } from "@/features/landing/components/footer-cta";

/**
 * 公開LP。認証不要でアクセスできる。
 * ログイン済みの人にとってのトップはプロンプト一覧なので、そちらへ送る
 * （ヘッダーのサイト名を押して LP に戻されるのは、使っている最中には邪魔なだけ）。
 * JWT を見るだけで DB は引かない。
 *
 * 配色は src/features/landing/landing.css の --lp-* を `.lp` 配下だけで使う
 * （globals.css の共有トークンはそのまま）。landing.css をここで import するのは、
 * Next のグローバル CSS は app/ 配下の page/layout からしか読み込めないため。
 */
export default async function HomePage() {
  if (await getSessionUser()) redirect("/prompts");

  return (
    <div className="lp flex flex-1 flex-col bg-[var(--lp-page)] text-[var(--lp-ink)]">
      <div className="mx-auto w-full max-w-5xl px-[14px] py-6 sm:px-6 md:py-10">
        {/* 挨拶ブロック相当。h1 は e2e が名前で探すので 1 テキストノードのまま割らない */}
        <section className="mb-8 py-6 text-center md:mb-12 md:py-12">
          <h1 className="text-[clamp(2rem,8vw,3.5rem)] leading-tight font-bold tracking-[-0.02em] text-balance">
            {hero.title}
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-[var(--lp-muted)] sm:text-lg">
            {hero.leadLines[0]}
            <br />
            {hero.leadLines[1]}
          </p>
        </section>

        <div className="grid gap-[9px] md:grid-cols-3 md:gap-5">
          <HeroCtaCard />
          <InstallPitchCard />
          <FeatureGrid />
          <PromptListPreview />
          <HowToSteps />
          <FooterCta />
        </div>
      </div>
    </div>
  );
}
