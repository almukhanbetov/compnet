import type { Metadata } from "next";
import ManagerApp from "@/components/manager/ManagerApp";
import { getServerTranslations } from "@/lib/i18n.server";

export async function generateMetadata(): Promise<Metadata> {
  const { manager } = await getServerTranslations();
  return { title: `${manager.requests.title} · COMPNET` };
}

export default function ManagerRequestsPage() {
  return <ManagerApp section="requests" />;
}
