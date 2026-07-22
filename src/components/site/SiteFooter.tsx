import Link from "next/link";
import { PrototypeBadge } from "./PrototypeBadge";

const FOOTER_LINKS: readonly {
  readonly heading: string;
  readonly links: readonly { readonly label: string; readonly href: string }[];
}[] = [
  {
    heading: "Getting Started",
    links: [
      { label: "Admissions", href: "/search?q=admissions" },
      { label: "Apply", href: "/search?q=how%20to%20apply" },
      { label: "Orientation", href: "/search?q=orientation" },
      { label: "Registration", href: "/search?q=registration" },
    ],
  },
  {
    heading: "Paying for College",
    links: [
      { label: "Financial Aid", href: "/search?q=financial%20aid" },
      { label: "FAFSA", href: "/search?q=fafsa" },
      { label: "Scholarships", href: "/search?q=scholarships" },
    ],
  },
  {
    heading: "Support",
    links: [
      { label: "Counseling", href: "/search?q=counseling" },
      { label: "Tutoring", href: "/search?q=tutoring" },
      { label: "Library", href: "/search?q=library" },
      { label: "DSPS", href: "/search?q=dsps" },
    ],
  },
];

/** Institutional site footer with grouped links and the prototype disclaimer. */
export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-border bg-muted/40">
      <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-10 sm:grid-cols-2 md:grid-cols-4">
        <div>
          <p className="text-base font-bold text-foreground">Lemoore College</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Student Success Portal — a demonstration of an AI assistant integrated
            into a college website.
          </p>
          <PrototypeBadge className="mt-3" />
        </div>
        {FOOTER_LINKS.map((group) => (
          <div key={group.heading}>
            <p className="text-sm font-semibold text-foreground">{group.heading}</p>
            <ul className="mt-2 flex flex-col gap-1">
              {group.links.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-border">
        <p className="mx-auto w-full max-w-6xl px-4 py-4 text-xs text-muted-foreground">
          This is a demonstration prototype, not the official Lemoore College
          website. All hours, deadlines, contacts, and links are sample data for
          local development and are not official college information.
        </p>
      </div>
    </footer>
  );
}
