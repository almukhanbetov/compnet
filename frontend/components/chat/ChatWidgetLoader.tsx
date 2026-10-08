"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { chatWidgetEnabled } from "@/lib/chat/config";

// Loaded on demand: while the widget is disabled its code is never
// downloaded. Client-only, since the widget depends on browser state
// (cookies via fetch, visibility, viewport) and renders nothing useful on
// the server.
const ChatWidget = dynamic(() => import("@/components/chat/ChatWidget"), { ssr: false });

export default function ChatWidgetLoader() {
  const pathname = usePathname();
  // Never mount the visitor widget (and its polling) in the manager section.
  if (!chatWidgetEnabled || pathname?.startsWith("/manager")) {
    return null;
  }
  return <ChatWidget />;
}
