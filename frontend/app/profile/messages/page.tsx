import type { Metadata } from "next";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import ChatHero from "@/components/chat/ChatHero";
import ChatApp from "@/components/chat/ChatApp";

export const metadata: Metadata = {
  title: "Сообщения | COMPNET",
  description:
    "Чат с администратором COMPNET — демонстрационный прототип без backend.",
};

export default function ProfileMessagesPage() {
  return (
    <>
      <Header />

      <main>
        <ChatHero />
        <ChatApp />
      </main>

      <Footer />
    </>
  );
}
