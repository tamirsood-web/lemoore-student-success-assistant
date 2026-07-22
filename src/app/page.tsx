// Placeholder landing page for the Group 1 scaffold. The mobile-first public student
// chat experience is implemented in a later task group (see
// .kiro/specs/local-mvp-scaffold/tasks.md, Group 7).
export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">
        Lemoore Student Success Assistant
      </h1>
      <p className="max-w-prose text-sm text-muted-foreground">
        Local development scaffold is ready. The student question-and-answer experience
        will be implemented in a later task group.
      </p>
    </main>
  );
}
