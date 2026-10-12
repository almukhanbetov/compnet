import type { Metadata } from "next";
import { getServerTranslations } from "@/lib/i18n.server";

// The manager section is private: keep it out of search engines.
export async function generateMetadata(): Promise<Metadata> {
  const { manager } = await getServerTranslations();
  return {
    title: manager.title,
    robots: {
    index: false,
    follow: false,
    nocache: true,
      googleBot: { index: false, follow: false },
    },
  };
}

export default function ManagerLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
