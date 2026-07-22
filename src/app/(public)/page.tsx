import { getEnv } from "@/lib/validation";
import { ChatContainer } from "@/features/chat/ChatContainer";

// Server component: reads the server-validated input limit and passes the numeric value
// into the client chat component. No server-only module or AWS env value reaches the client.
export default function PublicHomePage() {
  const maxInputChars = getEnv().chatMaxInputChars;
  return <ChatContainer maxInputChars={maxInputChars} />;
}
