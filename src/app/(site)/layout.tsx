import type { ReactNode } from "react";
import { getEnv } from "@/lib/validation";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { FloatingAssistant } from "@/features/chat/FloatingAssistant";

/**
 * College-website chrome for the public marketing/portal experience. Full-width header and
 * footer wrap each page, and the floating AI assistant is available on every page.
 *
 * The server-validated input limit is read here (server component) and passed to the
 * client assistant, so no server-only env value reaches the browser bundle.
 */
export default function SiteLayout({ children }: { children: ReactNode }) {
  const maxInputChars = getEnv().chatMaxInputChars;
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
      <FloatingAssistant maxInputChars={maxInputChars} />
    </div>
  );
}
