import ServiceDetailSection from "@/components/home/ServiceDetailSection";
import type { ServiceDetail } from "@/types/serviceDetail";

interface MobileAppsSectionProps {
  detail: ServiceDetail;
}

export default function MobileAppsSection({ detail }: MobileAppsSectionProps) {
  return <ServiceDetailSection detail={detail} />;
}
