import type { ReactNode } from "react";
import { SearchProvider } from "@/features/search/SearchProvider";
import { PrototypeBanner } from "@/features/site/PrototypeBanner";
import { SiteHeader } from "@/features/site/SiteHeader";
import { SiteFooter } from "@/features/site/SiteFooter";
import { AssistantWidget } from "@/features/assistant/AssistantWidget";

/**
 * Public site shell reproducing the Lemoore College chrome: prototype disclosure bar,
 * header (utility + main nav + AI search), page content, institutional footer, and the
 * floating Student Assistant. The SearchProvider hosts the single shared search overlay.
 */
export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <SearchProvider>
      <div className="flex min-h-screen flex-col overflow-x-hidden bg-white">
        <PrototypeBanner />
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </div>
      <AssistantWidget />
    </SearchProvider>
  );
}
