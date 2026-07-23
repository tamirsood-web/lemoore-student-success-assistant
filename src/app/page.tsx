// Public student home page — mobile-first chat experience.
// Server component; ChatInterface is "use client".

import { ChatInterface } from "@/features/chat";

export default function Home() {
  return (
    <main className="flex h-dvh flex-col">
      <header className="shrink-0 border-b border-border bg-background px-4 py-3">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <div>
            <h1 className="text-base font-semibold leading-tight text-foreground">Lemoore College</h1>
            <p className="text-xs text-muted-foreground">Student Success Assistant</p>
          </div>
          <span className="rounded-full border border-border px-2.5 py-0.5 text-xs text-muted-foreground">
            Demo
          </span>
        </div>
      </header>
      <div className="min-h-0 flex-1">
        <ChatInterface />
      </div>
    </main>
  );
}
