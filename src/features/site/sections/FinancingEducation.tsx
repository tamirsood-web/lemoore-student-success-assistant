// "Financing Your Education" — three financial cards over a brand-navy band, mirroring the
// real homepage. Cards are inactive; the real financial-aid information is reachable through
// AI search (which cites the official pages).

import { FINANCING_CARDS } from "../homeContent";
import { InactiveControl } from "../InactiveControl";

export function FinancingEducation() {
  return (
    <section aria-labelledby="financing-heading" className="bg-lc-navy">
      <div className="mx-auto max-w-site px-4 py-16">
        <div className="max-w-3xl">
          <h2 id="financing-heading" className="text-3xl font-extrabold text-white">
            Financing Your Education
          </h2>
          <p className="mt-3 text-lg text-white/85">
            Nothing is out of reach — and that includes the cost of your education. See how
            financial aid programs support you when you need it most.
          </p>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-3">
          {FINANCING_CARDS.map((card) => (
            <div
              key={card.title}
              className="flex flex-col rounded-xl bg-white p-6 shadow-sm"
            >
              <h3 className="text-xl font-bold text-lc-ink">{card.title}</h3>
              <p className="mt-2 flex-1 text-sm text-lc-slate">{card.body}</p>
              <InactiveControl className="mt-4 self-start text-sm font-semibold text-lc-blue hover:underline">
                Learn more →
              </InactiveControl>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
