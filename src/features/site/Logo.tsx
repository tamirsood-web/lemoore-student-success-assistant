// Inline SVG wordmark approximating the Lemoore College logo lockup.
//
// The official site uses a proprietary SVG logo asset that cannot be reproduced verbatim
// here, so this is a faithful institutional stand-in (Golden-Eagle emblem + wordmark) in
// the brand navy/gold. It is clearly a prototype rendering, not the official mark.

export function Logo({ className }: { readonly className?: string }) {
  return (
    <span className={`flex items-center gap-3 ${className ?? ""}`}>
      <svg
        viewBox="0 0 48 48"
        role="img"
        aria-label="Lemoore College emblem"
        className="h-11 w-11 shrink-0"
      >
        <circle cx="24" cy="24" r="23" fill="#012c54" />
        <circle cx="24" cy="24" r="23" fill="none" stroke="#f5a81c" strokeWidth="2" />
        {/* Stylized eagle mark */}
        <path
          d="M24 11c-4 4-9 5-13 5 3 3 4 7 4 7-3 0-5 1-5 1 5 4 11 4 11 4v8h6v-8s6 0 11-4c0 0-2-1-5-1 0 0 1-4 4-7-4 0-9-1-13-5z"
          fill="#f5a81c"
        />
      </svg>
      <span className="flex flex-col leading-none">
        <span className="text-[1.15rem] font-extrabold tracking-tight text-lc-navy">
          Lemoore College
        </span>
        <span className="mt-0.5 text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-lc-slate">
          West Hills Community College District
        </span>
      </span>
    </span>
  );
}
