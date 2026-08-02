import type { Metadata } from "next";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import ContactHero from "@/components/contact/ContactHero";
import ProjectEstimateForm from "@/components/contact/ProjectEstimateForm";
import ContactMethods from "@/components/contact/ContactMethods";
import ContactFaq from "@/components/contact/ContactFaq";

export const metadata: Metadata = {
  title: "Контакты и расчёт стоимости | COMPNET",
  description:
    "Оставьте заявку на сайт, web- или мобильное приложение, CRM либо AI-решение — получите ориентировочную стоимость и свяжитесь с COMPNET удобным способом.",
};

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
