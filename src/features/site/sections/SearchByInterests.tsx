// "Search By Your Interests" — the real homepage's academic-interest grid. Cards are
// inactive in this prototype (accessible disabled controls).

import { INTEREST_CATEGORIES } from "../homeContent";
import { InactiveControl } from "../InactiveControl";

export function SearchByInterests() {
  return (
    <section aria-labelledby="interests-heading" className="mx-auto max-w-site px-4 py-16">
      <div className="max-w-3xl">
        <h2 id="interests-heading" className="text-3xl font-extrabold text-lc-ink">
          Search By Your Interests
        </h2>
        <p className="mt-3 text-lg text-lc-slate">
          Lemoore College offers more than 60 degree programs and certificates in
          nursing, child development, business and more. Find your perfect match today.
        </p>
      </div>

      <ul className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {INTEREST_CATEGORIES.map((category) => (
          <li key={category}>
            <InactiveControl className="flex h-full w-full items-center rounded-lg border border-lc-line bg-white p-4 text-left text-[0.95rem] font-semibold text-lc-ink hover:border-lc-blue hover:text-lc-blue">
              {category}
            </InactiveControl>
          </li>
        ))}
      </ul>
    </section>
  );
}
