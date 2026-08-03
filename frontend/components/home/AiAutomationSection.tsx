import ServiceDetailSection from "@/components/home/ServiceDetailSection";
import type { ServiceDetail } from "@/types/serviceDetail";

interface AiAutomationSectionProps {
  detail: ServiceDetail;
}

export default function AiAutomationSection({ detail }: AiAutomationSectionProps) {
  return <ServiceDetailSection detail={detail} reversed />;
}
