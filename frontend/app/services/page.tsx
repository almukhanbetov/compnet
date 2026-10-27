import { ArrowRight } from "lucide-react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import WebDevelopmentSection from "@/components/home/WebDevelopmentSection";
import WebAppsSection from "@/components/home/WebAppsSection";
import MobileAppsSection from "@/components/home/MobileAppsSection";
import AiAutomationSection from "@/components/home/AiAutomationSection";
import CtaSection from "@/components/home/CtaSection";
import PageHeroVisual from "@/components/ui/PageHeroVisual";
import { heroVisuals } from "@/data/heroVisuals";
import { heroVisualAlts } from "@/data/i18n/heroVisuals";
import { fetchServiceDetailsBySlug } from "@/lib/api/content";
import { getRequestLocale, getServerTranslations } from "@/lib/i18n.server";
import { withCanonical } from "@/lib/seo";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  return withCanonical("/services", (await getServerTranslations()).common.seo.services);
}

export const dynamic = "force-dynamic";

export default async function ServicesPage() {
  const locale = await getRequestLocale();
  const details = await fetchServiceDetailsBySlug(locale);
  const { home, common } = await getServerTranslations();

  return (
    <>
      <Header />

      <main>
        <PageHeroVisual
          badge={home.servicesPage.badge}
          title={
            <>
              {home.servicesPage.titleStart}{" "}
              <span className="bg-gradient-to-r from-violet-400 via-blue-400 to-cyan-300 bg-clip-text text-transparent">
                COMPNET
              </span>
            </>
          }
          description={home.servicesPage.description}
          image={heroVisuals.services}
          alt={heroVisualAlts[locale].services}
          primaryCTA={{ label: common.discussProject, href: "/contact", icon: <ArrowRight className="h-4 w-4" aria-hidden="true" /> }}
          compact
        />

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
