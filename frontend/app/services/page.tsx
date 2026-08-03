import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import WebDevelopmentSection from "@/components/home/WebDevelopmentSection";
import WebAppsSection from "@/components/home/WebAppsSection";
import MobileAppsSection from "@/components/home/MobileAppsSection";
import AiAutomationSection from "@/components/home/AiAutomationSection";
import CtaSection from "@/components/home/CtaSection";
import { fetchServiceDetailsBySlug } from "@/lib/api/content";

export const dynamic = "force-dynamic";

export default async function ServicesPage() {
  const details = await fetchServiceDetailsBySlug();

  return (
    <>
      <Header />

      <main>
        <section className="px-6 py-20 md:py-28">
          <div className="mx-auto max-w-2xl text-center">
            <span className="inline-flex rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-sm text-cyan-300 light:border-cyan-600/30 light:bg-cyan-500/10 light:text-cyan-700">
              Услуги
            </span>

            <h1 className="mt-8 text-4xl font-bold leading-tight md:text-6xl">
              Услуги{" "}
              <span className="bg-gradient-to-r from-violet-400 via-blue-400 to-cyan-300 bg-clip-text text-transparent">
                COMPNET
              </span>
            </h1>

            <p className="mt-6 text-lg leading-8 text-slate-400 light:text-slate-600">
              Полный цикл разработки — от идеи и дизайна до запуска и
              поддержки. Ниже — подробности по каждому направлению.
            </p>
          </div>
        </section>

        {details["web-development"] && (
          <WebDevelopmentSection detail={details["web-development"]} />
        )}
        {details["web-apps"] && <WebAppsSection detail={details["web-apps"]} />}
        {details["mobile-apps"] && (
          <MobileAppsSection detail={details["mobile-apps"]} />
        )}
        {details["ai-automation"] && (
          <AiAutomationSection detail={details["ai-automation"]} />
        )}
        <CtaSection />
      </main>

      <Footer />
    </>
  );
}
