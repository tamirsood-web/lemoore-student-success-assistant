type BadgeVariant = "default" | "success" | "warning" | "danger" | "info" | "outline";

const variantClasses: Record<BadgeVariant, string> = {
  default: "bg-muted text-muted-foreground",
  success: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
  warning: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  danger: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  info: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  outline: "border border-border bg-transparent text-foreground",
};

type BadgeProps = { variant?: BadgeVariant; children: React.ReactNode; className?: string };

export function Badge({ variant = "default", children, className = "" }: BadgeProps) {
  return (
    <span className={["inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", variantClasses[variant], className].join(" ")}>
      {children}
    </span>
  );
}
