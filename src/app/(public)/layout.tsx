import type { ReactNode } from "react";

/** Public route-group chrome: page landmarks around the student chat experience. */
export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-4">
      <header className="py-6">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Lemoore Student Success Assistant
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Grounded answers from sample college sources, with citations and safe
          escalation.
        </p>
      </header>
      <main className="flex-1 pb-8">{children}</main>
      <footer className="border-t border-border py-4 text-xs text-muted-foreground">
        Local demo using sample data. Answers may reference sample sources and are
        not official Lemoore College information.
      </footer>
    </div>
  );
}
