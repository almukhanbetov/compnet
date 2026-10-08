import type { Metadata } from "next";
import Script from "next/script";
import { MotionConfig } from "motion/react";
import "./globals.css";
import { LocaleProvider } from "@/components/providers/LocaleProvider";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import ChatWidgetLoader from "@/components/chat/ChatWidgetLoader";

export const metadata: Metadata = {
  title: "COMPNET AI Platform",
  description:
    "Современная маркетинговая, торговая и клиентская платформа",
};

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

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="ru" suppressHydrationWarning>
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
            <LocaleProvider>
              {children}
              <ChatWidgetLoader />
            </LocaleProvider>
          </ThemeProvider>
        </MotionConfig>
      </body>
    </html>
  );
}
