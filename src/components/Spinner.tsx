type SpinnerProps = { label?: string; size?: "sm" | "md" | "lg"; className?: string };

const sizeClasses = { sm: "h-4 w-4 border-2", md: "h-6 w-6 border-2", lg: "h-8 w-8 border-[3px]" };

export function Spinner({ label = "Loading…", size = "md", className = "" }: SpinnerProps) {
  return (
    <span role="status" aria-label={label} className={["inline-flex", className].join(" ")}>
      <span aria-hidden="true" className={["animate-spin rounded-full border-border border-t-accent", sizeClasses[size]].join(" ")} />
      <span className="sr-only">{label}</span>
    </span>
  );
}
