"use client";

import { useState } from "react";
import type { LocationCardData } from "@/types";
import { Card } from "@/components/ui";

function isSafeHttpUri(uri: string): boolean {
  return uri.startsWith("https://") || uri.startsWith("http://");
}

function telHref(phone: string): string | null {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 10 || digits.length > 15) return null;
  if (digits.startsWith("000")) return null; // reserved fictional demo number
  return `tel:${digits}`;
}

export interface LocationCardProps {
  readonly location: LocationCardData;
}

/**
 * Displays structured location/contact info for a department.
 * Includes an expandable inline campus map (iframe). Falls back gracefully if
 * the map URL is absent or the iframe fails to load.
 * All values are demo data — never claim official accuracy.
 */
export function LocationCard({ location }: LocationCardProps) {
  const [mapOpen, setMapOpen] = useState(false);
  const [iframeError, setIframeError] = useState(false);

  const phone = location.phone ? telHref(location.phone) : null;
  const websiteUrl =
    location.url && isSafeHttpUri(location.url) ? location.url : undefined;
  const mapUrl =
    location.mapUrl && isSafeHttpUri(location.mapUrl) ? location.mapUrl : undefined;

  return (
    <Card className="mt-3 border-l-4 border-l-accent bg-muted">
      {/* ── Header row ─────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="text-sm font-semibold text-foreground">{location.name}</h3>
        {mapUrl ? (
          <a
            href={mapUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 rounded border border-accent px-2 py-0.5 text-xs font-medium text-accent underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
            aria-label={`Open full campus map for ${location.name}`}
          >
            Open full map ↗
          </a>
        ) : null}
      </div>

      {/* ── Contact details ────────────────────────────────────────── */}
      <dl className="mt-2 flex flex-col gap-1 text-sm text-foreground">
        {location.building ? (
          <div className="flex flex-wrap gap-1">
            <dt className="text-muted-foreground">Location:</dt>
            <dd className="break-words">{location.building}</dd>
          </div>
        ) : null}

        {location.hours ? (
          <div className="flex flex-wrap gap-1">
            <dt className="text-muted-foreground">Hours:</dt>
            <dd className="break-words">{location.hours}</dd>
          </div>
        ) : null}

        {location.phone ? (
          <div className="flex flex-wrap gap-1">
            <dt className="text-muted-foreground">Phone:</dt>
            <dd className="break-words">
              {phone ? (
                <a href={phone} className="text-accent underline underline-offset-2">
                  {location.phone}
                </a>
              ) : (
                location.phone
              )}
            </dd>
          </div>
        ) : null}

        {location.email ? (
          <div className="flex flex-wrap gap-1">
            <dt className="text-muted-foreground">Email:</dt>
            <dd className="break-words">
              <a
                href={`mailto:${location.email}`}
                className="text-accent underline underline-offset-2"
              >
                {location.email}
              </a>
            </dd>
          </div>
        ) : null}

        {websiteUrl ? (
          <div className="flex flex-wrap gap-1">
            <dt className="text-muted-foreground">Website:</dt>
            <dd className="break-words">
              <a
                href={websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent underline underline-offset-2"
              >
                {websiteUrl}
              </a>
            </dd>
          </div>
        ) : null}
      </dl>

      {/* ── Inline map toggle ──────────────────────────────────────── */}
      {mapUrl ? (
        <div className="mt-3">
          <button
            type="button"
            onClick={() => setMapOpen((prev) => !prev)}
            aria-expanded={mapOpen}
            aria-controls="location-map-embed"
            className="inline-flex items-center gap-1 rounded border border-border bg-background px-2 py-1 text-xs font-medium text-foreground hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
          >
            <span aria-hidden="true">{mapOpen ? "▲" : "▼"}</span>
            {mapOpen ? "Hide map" : "Show map"}
          </button>

          {mapOpen ? (
            <div
              id="location-map-embed"
              className="mt-2 overflow-hidden rounded border border-border"
            >
              {iframeError ? (
                /* Graceful fallback: map couldn't load in the iframe */
                <div className="flex flex-col items-center gap-2 bg-muted px-4 py-6 text-center text-sm text-muted-foreground">
                  <p>The map could not be displayed here.</p>
                  <a
                    href={mapUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent underline underline-offset-2"
                  >
                    Open campus map in a new tab ↗
                  </a>
                </div>
              ) : (
                <iframe
                  src={mapUrl}
                  title="Lemoore College campus map (sample)"
                  className="h-64 w-full sm:h-80"
                  loading="lazy"
                  /* Sandbox: allow scripts (the map page needs them) but block
                     top-level navigation, popups, and form submission. */
                  sandbox="allow-scripts allow-same-origin"
                  onError={() => setIframeError(true)}
                  aria-label="Embedded campus map — opens full map on the button above"
                />
              )}
              <p className="border-t border-border bg-background px-3 py-1.5 text-xs text-muted-foreground">
                Campus map preview — sample demo only. Not an official Lemoore College map.
              </p>
            </div>
          ) : null}
        </div>
      ) : null}

      {/* ── Footer disclaimer ──────────────────────────────────────── */}
      <p className="mt-2 text-xs text-muted-foreground">
        Sample demo location — not official Lemoore College information.
      </p>
    </Card>
  );
}
