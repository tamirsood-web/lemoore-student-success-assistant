// Persistent, non-intrusive prototype disclosure. Required in the utility bar so no viewer
// can mistake this demonstration for the official Lemoore College website.

export function PrototypeBanner() {
  return (
    <div className="bg-lc-gold text-lc-navy-dark">
      <div className="mx-auto flex max-w-site items-center justify-center gap-2 px-4 py-1 text-center text-[0.72rem] font-semibold">
        <span aria-hidden="true">●</span>
        <span>Prototype Demo — Not the official Lemoore College website</span>
      </div>
    </div>
  );
}
