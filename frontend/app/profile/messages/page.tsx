import { redirect } from "next/navigation";

// The demo chat page has been replaced by the chat widget available on
// every page; old links land on the contacts page instead of a fake chat.
export default function ProfileMessagesPage() {
  redirect("/contact");
}
