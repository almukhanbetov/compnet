import ServiceDetailSection from "@/components/home/ServiceDetailSection";
import { webAppsDetail } from "@/data/serviceDetails";

export default function WebAppsSection() {
  return <ServiceDetailSection detail={webAppsDetail} reversed tinted />;
}
