import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import Hero from "@/components/home/Hero";
import WhatWeCreateSection from "@/components/home/WhatWeCreateSection";
import ServicesOverviewSection from "@/components/home/ServicesOverviewSection";
import PricingSection from "@/components/home/PricingSection";
import TechStackSection from "@/components/home/TechStackSection";
import HowItWorksSection from "@/components/home/HowItWorksSection";
import PortfolioSection from "@/components/home/PortfolioSection";
import FeaturesSection from "@/components/home/FeaturesSection";
import TestimonialsSection from "@/components/home/TestimonialsSection";
import FaqSection from "@/components/home/FaqSection";
import CtaSection from "@/components/home/CtaSection";
import ContactSection from "@/components/home/ContactSection";
import {
  fetchServicesOverview,
  fetchPricingCards,
  fetchTestimonials,
} from "@/lib/api/content";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [servicesOverview, pricingCards, testimonials] = await Promise.all([
    fetchServicesOverview(),
    fetchPricingCards(),
    fetchTestimonials(),
  ]);

  return (
    <>
      <Header />
      <main>
        <Hero />
        <WhatWeCreateSection />
        <ServicesOverviewSection items={servicesOverview} />
        <PricingSection items={pricingCards} />
        <TechStackSection />
        <HowItWorksSection />
        <PortfolioSection />
        <FeaturesSection />
        <TestimonialsSection items={testimonials} />
        <FaqSection />
        <CtaSection />
        <ContactSection />
      </main>
      <Footer />
    </>
  );
}
