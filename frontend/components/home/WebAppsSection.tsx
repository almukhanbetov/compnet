import ServiceDetailSection from "@/components/home/ServiceDetailSection";
import type { ServiceDetail } from "@/types/serviceDetail";

interface WebAppsSectionProps {
  detail: ServiceDetail;
}

export default function WebAppsSection({ detail }: WebAppsSectionProps) {
  return <ServiceDetailSection detail={detail} reversed tinted />;
}
