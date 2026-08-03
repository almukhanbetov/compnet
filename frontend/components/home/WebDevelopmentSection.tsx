import ServiceDetailSection from "@/components/home/ServiceDetailSection";
import type { ServiceDetail } from "@/types/serviceDetail";

interface WebDevelopmentSectionProps {
  detail: ServiceDetail;
}

export default function WebDevelopmentSection({ detail }: WebDevelopmentSectionProps) {
  return <ServiceDetailSection detail={detail} />;
}
