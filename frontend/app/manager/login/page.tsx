import { Suspense } from "react";
import type { Metadata } from "next";
import ManagerLoginForm from "@/components/manager/ManagerLoginForm";

export const metadata: Metadata = {
  title: "Вход для менеджера · COMPNET",
};

export default function ManagerLoginPage() {
  // useSearchParams (the ?reason= notice) needs a Suspense boundary.
  return (
    <Suspense fallback={null}>
      <ManagerLoginForm />
    </Suspense>
  );
}
