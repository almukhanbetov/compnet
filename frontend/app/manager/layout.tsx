import type { Metadata } from "next";

// The manager section is private: keep it out of search engines.
export const metadata: Metadata = {
  title: "Диалоги · COMPNET",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false },
  },
};

export default function ManagerLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
