import type { Metadata } from "next";
import Script from "next/script";
import { MotionConfig } from "motion/react";
import "./globals.css";
import { LocaleProvider } from "@/components/providers/LocaleProvider";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import ChatWidgetLoader from "@/components/chat/ChatWidgetLoader";
import AnalyticsProvider from "@/components/analytics/AnalyticsProvider";
import { getRequestLocale, getServerTranslations } from "@/lib/i18n.server";
import { SITE_URL } from "@/lib/site";

// No canonical here: it would be inherited by every page. Each indexable
// page sets its own with withCanonical().
export async function generateMetadata(): Promise<Metadata> {
  return { metadataBase: new URL(SITE_URL), ...(await getServerTranslations()).common.seo.root };
}

type RootLayoutProps = Readonly<{
  children: React.ReactNode;
}>;

const themeInitScript = `
(function () {
  try {
    var stored = window.localStorage.getItem("compnet-theme");
    var theme = stored === "light" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", theme);
  } catch (e) {}
})();
`;

export default async function RootLayout({ children }: RootLayoutProps) {
  const locale = await getRequestLocale();

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <Script
          id="theme-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: themeInitScript }}
        />
      </head>
      <body>
        <MotionConfig reducedMotion="user">
          <ThemeProvider>
            <LocaleProvider initialLocale={locale}>
              {children}
              <ChatWidgetLoader />
              <AnalyticsProvider />
            </LocaleProvider>
          </ThemeProvider>
        </MotionConfig>
      </body>
    </html>
  );
}
