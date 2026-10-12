import { Suspense } from "react";
import type { Metadata } from "next";
import ManagerLoginForm from "@/components/manager/ManagerLoginForm";
import { getServerTranslations } from "@/lib/i18n.server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getServerTranslations()).manager.loginTitle };
}

export default function ManagerLoginPage() {
  // useSearchParams (the ?reason= notice) needs a Suspense boundary.
  return (
    <Suspense fallback={null}>
      <ManagerLoginForm />
    </Suspense>
  );
}
