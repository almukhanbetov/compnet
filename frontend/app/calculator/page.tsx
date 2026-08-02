import type { Metadata } from "next";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import CalculatorHero from "@/components/calculator/CalculatorHero";
import CalculatorForm from "@/components/calculator/CalculatorForm";

export const metadata: Metadata = {
  title: "Калькулятор стоимости | COMPNET",
  description:
    "Рассчитайте ориентировочную стоимость и сроки разработки сайта, web- или мобильного приложения с учётом модулей, дизайна и сложности.",
};

export default function CalculatorPage() {
  return (
    <>
      <Header />

      <main>
        <CalculatorHero />
        <CalculatorForm />
      </main>

      <Footer />
    </>
  );
}
