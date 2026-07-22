// "Latest News & Events" — upcoming events, announcements, and news, in the real homepage's
// three-column arrangement. Content here is illustrative prototype content (clearly labeled)
// and every item is inactive.

import { ANNOUNCEMENTS, NEWS, UPCOMING_EVENTS } from "../homeContent";
import { InactiveControl } from "../InactiveControl";

export function NewsEvents() {
  return (
    <section aria-labelledby="news-heading" className="bg-lc-wash">
      <div className="mx-auto max-w-site px-4 py-16">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 id="news-heading" className="text-3xl font-extrabold text-lc-ink">
            Latest News &amp; Events
          </h2>
          <span className="rounded bg-lc-line px-2 py-1 text-xs font-medium text-lc-slate">
            Illustrative prototype content
          </span>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Upcoming events */}
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wide text-lc-blue">
              Upcoming Events
            </h3>
            <ul className="mt-4 space-y-3">
              {UPCOMING_EVENTS.map((event) => (
                <li
                  key={event.title}
                  className="flex items-center gap-4 rounded-lg border border-lc-line bg-white p-3"
                >
                  <span className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-md bg-lc-navy text-white">
                    <span className="text-[0.6rem] font-semibold uppercase">
                      {event.date.split(" ")[0]}
                    </span>
                    <span className="text-lg font-extrabold leading-none">
                      {event.date.split(" ")[1]}
                    </span>
                  </span>
                  <span className="text-sm font-medium text-lc-ink">{event.title}</span>
                </li>
              ))}
            </ul>
            <InactiveControl className="mt-4 text-sm font-semibold text-lc-blue hover:underline">
              See All Events →
            </InactiveControl>
          </div>

          {/* Announcements */}
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wide text-lc-blue">
              Announcements
            </h3>
            <ul className="mt-4 space-y-3">
              {ANNOUNCEMENTS.map((item) => (
                <li key={item} className="rounded-lg border border-lc-line bg-white p-4 text-sm text-lc-ink">
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* News */}
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wide text-lc-blue">
              News
            </h3>
            <ul className="mt-4 space-y-3">
              {NEWS.map((item) => (
                <li key={item} className="rounded-lg border border-lc-line bg-white p-4 text-sm text-lc-ink">
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
