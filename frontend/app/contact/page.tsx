import type { Metadata } from "next";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import ContactHero from "@/components/contact/ContactHero";
import ProjectEstimateForm from "@/components/contact/ProjectEstimateForm";
import ContactMethods from "@/components/contact/ContactMethods";
import ContactFaq from "@/components/contact/ContactFaq";
import { getServerTranslations } from "@/lib/i18n.server";

export async function generateMetadata(): Promise<Metadata> {
  return (await getServerTranslations()).common.seo.contact;
}

export default function ContactPage() {
  return (
    <>
      <Header />

      <main>
        <ContactHero />
        <ProjectEstimateForm />
        <ContactMethods />
        <ContactFaq />
      </main>

      <Footer />
    </>
  );
}
