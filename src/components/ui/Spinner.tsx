import { cn } from "@/lib/utils/cn";

export interface SpinnerProps {
  /** Accessible status label announced to assistive tech and shown beside the spinner. */
  readonly label?: string;
  readonly className?: string;
}

/** Accessible loading indicator with a live status label. */
export function Spinner({ label = "Loading…", className }: SpinnerProps) {
  return (
    <span
      role="status"
      aria-live="polite"
      className={cn(
        "inline-flex items-center gap-2 text-sm text-muted-foreground",
        className,
      )}
    >
      <svg
        className="h-4 w-4 animate-spin"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4z"
        />
      </svg>
      <span>{label}</span>
    </span>
  );
}
