import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

type ButtonVariant = "primary" | "secondary" | "ghost";
type ButtonSize = "sm" | "md";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  readonly variant?: ButtonVariant;
  readonly size?: ButtonSize;
}

const BASE =
  "inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50";

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-accent text-accent-foreground hover:opacity-90",
  secondary: "border border-border bg-background text-foreground hover:bg-muted",
  ghost: "text-foreground hover:bg-muted",
};

const SIZES: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-sm",
  md: "h-10 px-4 text-sm",
};

/** Accessible button primitive: native <button>, visible focus ring, clear disabled state. */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", className, type, ...props }, ref) => (
    <button
      ref={ref}
      type={type ?? "button"}
      className={cn(BASE, VARIANTS[variant], SIZES[size], className)}
      {...props}
    />
  ),
);
Button.displayName = "Button";
