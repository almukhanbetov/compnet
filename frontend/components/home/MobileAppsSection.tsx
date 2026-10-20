import ServiceDetailSection from "@/components/home/ServiceDetailSection";
import { MOBILE_APP_DEVELOPMENT_PATH, mobileAppDevelopmentTranslations } from "@/data/i18n/mobileAppDevelopment";
import { getRequestLocale } from "@/lib/i18n.server";
import type { ServiceDetail } from "@/types/serviceDetail";

interface MobileAppsSectionProps {
  detail: ServiceDetail;
}

export default async function MobileAppsSection({ detail }: MobileAppsSectionProps) {
  const { serviceLink } = mobileAppDevelopmentTranslations[await getRequestLocale()];
  return (
    <ServiceDetailSection
      detail={detail}
      link={{ href: MOBILE_APP_DEVELOPMENT_PATH, label: serviceLink }}
    />
  );
}
