import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

/** Neutral surface container with a restrained border and soft shadow. */
export const Card = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "rounded-lg border border-border bg-background p-4 shadow-sm",
        className,
      )}
      {...props}
    />
  ),
);
Card.displayName = "Card";
