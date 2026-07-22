import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { Card } from "@/components/ui";
import { HomeHeroSearch } from "@/features/search";

export const metadata: Metadata = {
  title: "Lemoore College — Student Success Portal (Prototype Demo)",
  description:
    "Demonstration prototype: a college website with an integrated AI Student Success Assistant. Not the official Lemoore College website.",
};

// ---------------------------------------------------------------------------------------
// Small inline icon set (no icon dependency). Decorative only (aria-hidden).
// ---------------------------------------------------------------------------------------
function Icon({ path }: { readonly path: ReactNode }) {
  return (
    <svg
      className="h-6 w-6"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {path}
    </svg>
  );
}

const ICONS = {
  admissions: <path d="M4 7h16M4 12h16M4 17h10M6 3v18" />,
  aid: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v8M9.5 10.5c0-1 1.1-1.5 2.5-1.5s2.5.6 2.5 1.7c0 2-5 1-5 3 0 1.1 1.1 1.7 2.5 1.7s2.5-.5 2.5-1.5" />
    </>
  ),
  counseling: (
    <>
      <path d="M21 15a2 2 0 0 1-2 2H8l-4 4V5a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2Z" />
    </>
  ),
  registration: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <path d="M8 2v4M16 2v4M4 10h16M9 15l2 2 4-4" />
    </>
  ),
} as const;

// ---------------------------------------------------------------------------------------
// Hero
// ---------------------------------------------------------------------------------------
const HERO_CHIPS: readonly { readonly label: string; readonly href: string }[] = [
  { label: "FAFSA & Financial Aid", href: "/search?q=fafsa" },
  { label: "Register for classes", href: "/search?q=registration" },
  { label: "Request transcripts", href: "/search?q=transcripts" },
  { label: "Book a counselor", href: "/search?q=counseling" },
];

function Hero() {
  return (
    <section className="border-b border-border bg-gradient-to-b from-accent/10 to-background">
      <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:py-20">
        <p className="text-sm font-semibold uppercase tracking-wide text-accent">
          Lemoore College · Student Success
        </p>
        <h1 className="mt-3 max-w-3xl text-3xl font-bold tracking-tight text-foreground sm:text-4xl md:text-5xl">
          Your college questions, answered — day or night.
        </h1>
        <p className="mt-4 max-w-2xl text-base text-muted-foreground sm:text-lg">
          Search official student resources, or ask the AI Student Success
          Assistant for a grounded answer with sources. No account needed.
        </p>

        <div className="mt-8 max-w-2xl">
          <HomeHeroSearch />
          <ul className="mt-3 flex flex-wrap gap-2">
            {HERO_CHIPS.map((chip) => (
              <li key={chip.label}>
                <Link
                  href={chip.href}
                  className="rounded-full border border-border bg-background px-3 py-1 text-sm text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  {chip.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------------------
// Featured resources (the required Admissions / Financial Aid / Counseling / Registration)
// ---------------------------------------------------------------------------------------
const FEATURED: readonly {
  readonly title: string;
  readonly blurb: string;
  readonly href: string;
  readonly icon: ReactNode;
}[] = [
  {
    title: "Admissions & Records",
    blurb: "Apply, enroll, check office hours, and manage official records.",
    href: "/search?q=admissions",
    icon: ICONS.admissions,
  },
  {
    title: "Financial Aid",
    blurb: "FAFSA, grants, and scholarships to help you pay for college.",
    href: "/search?q=financial%20aid",
    icon: ICONS.aid,
  },
  {
    title: "Counseling",
    blurb: "Plan your classes, education plan, and transfer goals.",
    href: "/search?q=counseling",
    icon: ICONS.counseling,
  },
  {
    title: "Class Registration",
    blurb: "Register for classes and find important term deadlines.",
    href: "/search?q=registration",
    icon: ICONS.registration,
  },
];

function FeaturedResources() {
  return (
    <section aria-labelledby="featured-heading" className="mx-auto w-full max-w-6xl px-4 py-12">
      <h2 id="featured-heading" className="text-2xl font-bold tracking-tight text-foreground">
        Featured student resources
      </h2>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {FEATURED.map((item) => (
          <Card key={item.title} className="flex flex-col gap-3 p-5 transition-shadow hover:shadow-md">
            <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-accent/10 text-accent">
              <Icon path={item.icon} />
            </span>
            <h3 className="text-base font-semibold text-foreground">{item.title}</h3>
            <p className="flex-1 text-sm text-muted-foreground">{item.blurb}</p>
            <Link
              href={item.href}
              className="text-sm font-medium text-accent underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              Learn more →
            </Link>
          </Card>
        ))}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------------------
// Announcements & events (sample content) + quick links
// ---------------------------------------------------------------------------------------
const ANNOUNCEMENTS: readonly {
  readonly date: string;
  readonly title: string;
  readonly body: string;
  readonly href: string;
}[] = [
  {
    date: "Sample notice",
    title: "Fall registration is open",
    body: "Meet with a counselor before your registration date to review prerequisites.",
    href: "/search?q=registration",
  },
  {
    date: "Sample notice",
    title: "Complete your FAFSA early",
    body: "Submit the FAFSA or California Dream Act Application to be considered for aid.",
    href: "/search?q=fafsa",
  },
  {
    date: "Sample notice",
    title: "New student orientation",
    body: "Finish orientation online or in person before planning your first term.",
    href: "/search?q=orientation",
  },
];

const QUICK_LINKS: readonly { readonly label: string; readonly href: string }[] = [
  { label: "Transcripts", href: "/search?q=transcripts" },
  { label: "Academic Calendar", href: "/search?q=academic%20calendar" },
  { label: "Canvas", href: "/search?q=canvas" },
  { label: "Student Email", href: "/search?q=student%20email" },
  { label: "Library", href: "/search?q=library" },
  { label: "Tutoring", href: "/search?q=tutoring" },
  { label: "Bookstore", href: "/search?q=bookstore" },
  { label: "Parking", href: "/search?q=parking" },
  { label: "Transfer Center", href: "/search?q=transfer" },
  { label: "Career Center", href: "/search?q=career" },
  { label: "Veterans Services", href: "/search?q=veterans" },
  { label: "DSPS", href: "/search?q=dsps" },
  { label: "EOPS", href: "/search?q=eops" },
  { label: "CalWORKs", href: "/search?q=calworks" },
];

function AnnouncementsAndLinks() {
  return (
    <section className="border-y border-border bg-muted/30">
      <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-12 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Announcements &amp; events
          </h2>
          <ul className="mt-6 flex flex-col gap-4">
            {ANNOUNCEMENTS.map((item) => (
              <li key={item.title}>
                <Card className="flex flex-col gap-1 p-5 transition-shadow hover:shadow-md sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {item.date}
                    </p>
                    <h3 className="mt-1 font-semibold text-foreground">{item.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{item.body}</p>
                  </div>
                  <Link
                    href={item.href}
                    className="mt-2 shrink-0 text-sm font-medium text-accent underline-offset-2 hover:underline sm:mt-0 sm:pl-4"
                  >
                    Details →
                  </Link>
                </Card>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Quick links</h2>
          <nav aria-label="Quick links" className="mt-6">
            <ul className="grid grid-cols-2 gap-2">
              {QUICK_LINKS.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="block rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------------------
// AI assistant callout
// ---------------------------------------------------------------------------------------
function AssistantCallout() {
  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-14">
      <div className="flex flex-col items-start gap-4 rounded-2xl border border-border bg-accent/10 p-8 md:flex-row md:items-center md:justify-between">
        <div className="max-w-2xl">
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Meet your AI Student Success Assistant
          </h2>
          <p className="mt-2 text-muted-foreground">
            Ask questions in plain language and get concise answers grounded in
            official sources — with citations and an honest path to a human when
            something can&apos;t be verified. Open it anytime from the button in
            the bottom-right corner.
          </p>
        </div>
        <Link
          href="/assistant"
          className="inline-flex h-12 shrink-0 items-center rounded-md bg-accent px-6 font-medium text-accent-foreground transition-colors hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          Open the assistant
        </Link>
      </div>
    </section>
  );
}

export default function HomePage() {
  return (
    <>
      <Hero />
      <FeaturedResources />
      <AnnouncementsAndLinks />
      <AssistantCallout />
    </>
  );
}
