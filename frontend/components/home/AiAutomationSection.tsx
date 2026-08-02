import ServiceDetailSection from "@/components/home/ServiceDetailSection";
import { aiAutomationDetail } from "@/data/serviceDetails";

export default function AiAutomationSection() {
  return <ServiceDetailSection detail={aiAutomationDetail} reversed />;
}
