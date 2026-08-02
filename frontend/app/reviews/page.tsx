import type { Metadata } from "next";
import PlaceholderPage from "@/components/layout/PlaceholderPage";

export const metadata: Metadata = {
  title: "Отзывы клиентов | COMPNET",
  description:
    "Отзывы клиентов COMPNET о разработке сайтов, web- и мобильных приложений, CRM и AI-решений.",
};

export default function ReviewsPage() {
  return (
    <PlaceholderPage
      eyebrow="Отзывы"
      title="Отзывы клиентов"
      description="Полная лента отзывов с фильтрами по категориям и рейтингу появится на следующем этапе прототипа."
    />
  );
}
