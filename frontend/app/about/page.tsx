import type { Metadata } from "next";
import PlaceholderPage from "@/components/layout/PlaceholderPage";

export const metadata: Metadata = {
  title: "О компании | COMPNET",
  description:
    "COMPNET — IT-студия полного цикла: от идеи и дизайна до разработки, DevOps и технической поддержки.",
};

export default function AboutPage() {
  return (
    <PlaceholderPage
      eyebrow="О компании"
      title="О компании"
      description="COMPNET — IT-студия полного цикла: от идеи и дизайна до разработки, DevOps и технической поддержки."
      showDiscussCta
    />
  );
}
