import ServiceDetailSection from "@/components/home/ServiceDetailSection";
import { websiteDevelopmentTranslations } from "@/data/i18n/websiteDevelopment";
import { getRequestLocale } from "@/lib/i18n.server";
import type { ServiceDetail } from "@/types/serviceDetail";

interface WebDevelopmentSectionProps {
  detail: ServiceDetail;
}

export default async function WebDevelopmentSection({ detail }: WebDevelopmentSectionProps) {
  const { serviceLink } = websiteDevelopmentTranslations[await getRequestLocale()];
  return (
    <ServiceDetailSection
      detail={detail}
      link={{ href: "/services/website-development", label: serviceLink }}
    />
  );
}
