/**
 * Subtle, always-visible marker that this is a demonstration prototype and NOT the official
 * Lemoore College website. Required by the demo brief; keep it unobtrusive but legible.
 */
export function PrototypeBadge({ className = "" }: { readonly className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border border-amber-400/60 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800 dark:border-amber-300/30 dark:bg-amber-500/10 dark:text-amber-200 ${className}`}
      title="This is a demonstration prototype, not the official Lemoore College website."
    >
      <span aria-hidden="true">●</span>
      Prototype Demo
    </span>
  );
}
