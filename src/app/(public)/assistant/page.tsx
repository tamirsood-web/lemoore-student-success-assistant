import { getEnv } from "@/lib/validation";
import { ChatContainer } from "@/features/chat/ChatContainer";

// Standalone, full-page chat experience (kept as a deep-linkable fallback alongside the
// floating assistant on the main site). Server component: reads the server-validated input
// limit and passes the numeric value into the client chat component. No server-only module
// or AWS env value reaches the client.
export default function AssistantPage() {
  const maxInputChars = getEnv().chatMaxInputChars;
  return <ChatContainer maxInputChars={maxInputChars} />;
}
