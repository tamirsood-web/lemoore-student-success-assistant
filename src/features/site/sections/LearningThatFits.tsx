// "Learning That Fits Your Life" — three audience cards (Future Students, Adult Learners,
// Career-Focused Training), mirroring the real homepage's closing section.

import { AUDIENCE_CARDS } from "../homeContent";
import { InactiveControl } from "../InactiveControl";

export function LearningThatFits() {
  return (
    <section aria-labelledby="learning-heading" className="mx-auto max-w-site px-4 py-16">
      <div className="max-w-3xl">
        <h2 id="learning-heading" className="text-3xl font-extrabold text-lc-ink">
          Learning That Fits Your Life
        </h2>
        <p className="mt-3 text-lg text-lc-slate">
          Wherever you are in life, there&apos;s a perfect program for you at Lemoore College.
        </p>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
        {AUDIENCE_CARDS.map((card) => (
          <article
            key={card.title}
            className="overflow-hidden rounded-xl border border-lc-line bg-white shadow-sm"
          >
            {/* Neutral prototype image band */}
            <div
              aria-hidden="true"
              className="h-36 bg-gradient-to-br from-lc-blue to-lc-navy"
            />
            <div className="p-6">
              <h3 className="text-xl font-bold text-lc-ink">{card.title}</h3>
              <p className="mt-2 text-sm text-lc-slate">{card.body}</p>
              <InactiveControl className="mt-4 text-sm font-semibold text-lc-blue hover:underline">
                Explore →
              </InactiveControl>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
