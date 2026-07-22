// Accessible inactive control for ordinary navigation and promotional items.
//
// In this prototype every ordinary nav label / promo card is non-functional, but must not
// be a fake broken link that reloads the page. This renders a real, focusable button that
// announces itself as inactive (aria-disabled + descriptive title) and does nothing when
// activated — accessible, honest, and visually indistinguishable from the real controls.

import type { ReactNode } from "react";

const INACTIVE_TITLE = "Inactive in this prototype demo";

export function InactiveControl({
  children,
  className,
  label,
}: {
  readonly children: ReactNode;
  readonly className?: string;
  /** Optional accessible name override (defaults to the visible text). */
  readonly label?: string;
}) {
  return (
    // A type="button" with no handler performs no action when activated — an honest,
    // accessible inactive control that never navigates or reloads the page. Server-safe
    // (no event handler prop), so it can be used inside server components.
    <button
      type="button"
      aria-disabled="true"
      title={INACTIVE_TITLE}
      {...(label ? { "aria-label": `${label} (inactive in this prototype demo)` } : {})}
      className={`cursor-default ${className ?? ""}`}
    >
      {children}
    </button>
  );
}
