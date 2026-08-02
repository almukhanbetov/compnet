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
import FloatingChatButton from "@/components/home/FloatingChatButton";

export default function HomePage() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <WhatWeCreateSection />
        <ServicesOverviewSection />
        <PricingSection />
        <TechStackSection />
        <HowItWorksSection />
        <PortfolioSection />
        <FeaturesSection />
        <TestimonialsSection />
        <FaqSection />
        <CtaSection />
        <ContactSection />
      </main>
      <Footer />
      <FloatingChatButton />
    </>
  );
}
