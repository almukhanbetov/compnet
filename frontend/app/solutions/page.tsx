import type { Metadata } from "next";
import PlaceholderPage from "@/components/layout/PlaceholderPage";

export const metadata: Metadata = {
  title: "Решения | COMPNET",
  description:
    "Готовые архитектурные решения для CRM-систем, маркетплейсов, систем бронирования и AI-автоматизации от COMPNET.",
};

export default function SolutionsPage() {
  return (
    <PlaceholderPage
      eyebrow="Решения"
      title="Решения"
      description="Готовые архитектурные решения для CRM-систем, маркетплейсов, систем бронирования и AI-автоматизации — адаптируем под задачи вашего бизнеса."
      showDiscussCta
    />
  );
}
