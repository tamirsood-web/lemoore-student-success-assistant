// Institutional footer reproducing the real Lemoore College footer structure:
// dark-navy band, contact block, link columns, social row, and a legal bottom bar.

import { InactiveControl } from "./InactiveControl";
import {
  CONTACT,
  FOOTER_GROUPS,
  FOOTER_LEGAL,
  SOCIAL,
} from "./navigation";

export function SiteFooter() {
  return (
    <footer className="mt-20 bg-lc-navy text-white">
      <div className="mx-auto max-w-site px-4 py-12">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-4">
          {/* Contact / identity column */}
          <div className="md:col-span-1">
            <p className="text-lg font-bold">Lemoore College</p>
            <address className="mt-3 not-italic text-sm leading-relaxed text-white/80">
              {CONTACT.address}
              <br />
              <span className="mt-1 inline-block">{CONTACT.phone}</span>
            </address>
          </div>

          {/* Link columns */}
          {FOOTER_GROUPS.map((group) => (
            <nav key={group.heading} aria-label={group.heading}>
              <p className="text-sm font-bold uppercase tracking-wide text-lc-gold">
                {group.heading}
              </p>
              <ul className="mt-3 space-y-2">
                {group.links.map((link) => (
                  <li key={link}>
                    <InactiveControl className="text-sm text-white/80 hover:text-white">
                      {link}
                    </InactiveControl>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        {/* Social row */}
        <div className="mt-10 flex flex-wrap items-center gap-3 border-t border-white/15 pt-6">
          <span className="text-sm font-semibold text-white/70">Connect</span>
          {SOCIAL.map((platform) => (
            <InactiveControl
              key={platform}
              label={platform}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-white/25 text-[0.6rem] font-bold uppercase text-white/80 hover:border-lc-gold hover:text-lc-gold"
            >
              {platform.slice(0, 2)}
            </InactiveControl>
          ))}
        </div>
      </div>

      {/* Legal bottom bar */}
      <div className="bg-lc-navy-dark">
        <div className="mx-auto flex max-w-site flex-col gap-3 px-4 py-4 text-xs text-white/70 md:flex-row md:items-center md:justify-between">
          <p>
            © {new Date().getFullYear()} {CONTACT.district}. Prototype demo — not
            the official website.
          </p>
          <ul className="flex flex-wrap gap-4">
            {FOOTER_LEGAL.map((item) => (
              <li key={item}>
                <InactiveControl className="hover:text-white">
                  {item}
                </InactiveControl>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}
