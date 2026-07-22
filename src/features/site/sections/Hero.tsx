// Homepage hero/banner. Reproduces the real full-width promotional banner: a large image
// area (a neutral brand-navy photographic placeholder, since the official rotating photos
// can't be reproduced here), an eyebrow + large headline + supporting line, a gold CTA, and
// — as the flagship improvement — a prominent AI search entry.

import { HERO_SLIDES } from "../homeContent";
import { HeroSearchBar } from "./HeroSearchBar";
import { InactiveControl } from "../InactiveControl";

export function Hero() {
  const slide = HERO_SLIDES[0];
  if (!slide) return null;

  return (
    <section
      aria-label="Featured"
      className="relative overflow-hidden bg-lc-navy"
    >
      {/* Neutral photographic placeholder background (prototype imagery). */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-br from-lc-navy-dark via-lc-navy to-lc-blue-dark"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 20%, rgba(245,168,28,0.35), transparent 40%), radial-gradient(circle at 80% 70%, rgba(0,91,170,0.5), transparent 45%)",
        }}
      />

      <div className="relative mx-auto flex max-w-site flex-col justify-center px-4 py-16 sm:py-24">
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-lc-gold">
          {slide.eyebrow}
        </p>
        <h1 className="mt-3 max-w-2xl text-4xl font-extrabold leading-tight text-white sm:text-5xl">
          {slide.headline}
        </h1>
        <p className="mt-4 max-w-xl text-lg text-white/85">{slide.body}</p>

        <div className="mt-7 flex flex-wrap items-center gap-3">
          <InactiveControl className="rounded-md bg-lc-gold px-6 py-3 text-base font-bold text-lc-navy-dark hover:bg-lc-gold-dark">
            {slide.cta}
          </InactiveControl>
          <InactiveControl className="rounded-md border border-white/40 px-6 py-3 text-base font-semibold text-white hover:bg-white/10">
            It Starts Here
          </InactiveControl>
        </div>

        {/* Flagship: AI search entry */}
        <div className="mt-10">
          <p className="mb-2 text-sm font-medium text-white/80">
            New: search the site in plain language — answers cite official pages.
          </p>
          <HeroSearchBar />
        </div>
      </div>
    </section>
  );
}
