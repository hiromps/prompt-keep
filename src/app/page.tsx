import { redirect } from "next/navigation";
import { getSessionUser } from "@/auth/guards";
import "@/features/landing/landing.css";
import { HeroPoster } from "@/features/landing/components/hero-poster";
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
        {/* ファーストビュー（9:16 ポスター）。h1 はこの中に 1 つ */}
        <div className="mb-8 md:mb-14 md:py-6">
          <HeroPoster />
        </div>

        <div className="grid gap-[9px] md:grid-cols-3 md:gap-5">
          <FeatureGrid />
          <PromptListPreview />
          <InstallPitchCard />
          <HowToSteps />
          <FooterCta />
        </div>
      </div>
    </div>
  );
}
