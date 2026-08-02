import type { Metadata } from "next";
import PlaceholderPage from "@/components/layout/PlaceholderPage";

export const metadata: Metadata = {
  title: "Вход в аккаунт | COMPNET",
  description: "Вход в личный кабинет COMPNET.",
};

export default function LoginPage() {
  return (
    <PlaceholderPage
      eyebrow="Вход"
      title="Вход в аккаунт"
      description="Настоящая форма авторизации подключится, когда в проекте появится backend."
    />
  );
}
