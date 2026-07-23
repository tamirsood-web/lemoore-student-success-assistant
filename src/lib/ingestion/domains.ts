// Approved-domain + crawl-safety boundary for the ingestion pipeline (server/script-only).
//
// This REUSES the application's single source of truth for approved official domains
// (`APPROVED_OFFICIAL_DOMAINS` / `isApprovedOfficialUrl` in the validation layer) so the
// ingestion crawler can never index a host that the live citation layer would later reject.
// It adds crawl-time safety rules on TOP of that check: authenticated portals, form/search
// endpoints, calendar/pagination parameter loops, and non-content assets are refused here so
// they never reach download, extraction, or upload.

import {
  APPROVED_OFFICIAL_DOMAINS,
  isApprovedOfficialUrl,
} from "../validation";

export { APPROVED_OFFICIAL_DOMAINS, isApprovedOfficialUrl };

/**
 * Path fragments that indicate authenticated, student-specific, staff-only, or otherwise
 * non-public destinations. A URL whose path contains any of these is never crawled, even on
 * an approved domain (AGENTS.md §11 / task "CRAWL AUTHORIZATION AND SAFETY").
 */
const AUTHENTICATED_PATH_SIGNALS = [
  "/login",
  "/signin",
  "/sign-in",
  "/logout",
  "/account",
  "/myaccount",
  "/my-account",
  "/mywesthills",
  "/student-portal-login",
  "/canvas-login",
  "/webadvisor",
  "/selfservice",
  "/self-service",
  "/oauth",
  "/sso",
  "/auth/",
  "/admin/",
  "/dashboard",
  "/grades",
  "/transcript-order-status",
] as const;

/** Hosts that are login/identity portals we must never crawl even if on an approved domain. */
const AUTHENTICATED_HOST_SIGNALS = [
  "my.",
  "login.",
  "sso.",
  "canvas.",
  "portal.",
  "webadvisor.",
  "selfservice.",
] as const;

/**
 * Query keys that generate infinite / near-infinite parameter spaces (search loops, calendar
 * navigation, pagination). Presence of any of these makes a URL a crawl trap, not a page.
 */
const TRAP_QUERY_KEYS = [
  "q",
  "s",
  "search",
  "query",
  "keyword",
  "keywords",
  "page",
  "paged",
  "start",
  "offset",
  "cal_date",
  "date",
  "month",
  "year",
  "day",
  "view",
  "eventdate",
] as const;

/** File extensions that are non-textual assets (never useful as retrieval content). */
const ASSET_EXTENSIONS = [
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".webp",
  ".svg",
  ".ico",
  ".css",
  ".js",
  ".mjs",
  ".woff",
  ".woff2",
  ".ttf",
  ".eot",
  ".mp4",
  ".mov",
  ".avi",
  ".mp3",
  ".zip",
  ".rar",
] as const;

/** True when the URL host looks like a login/identity portal subdomain. */
export function isAuthenticatedHost(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return AUTHENTICATED_HOST_SIGNALS.some((sig) => host.startsWith(sig));
  } catch {
    return false;
  }
}

/** True when the URL path targets an authenticated / student-specific / staff-only area. */
export function isAuthenticatedPath(url: string): boolean {
  try {
    const path = new URL(url).pathname.toLowerCase();
    return AUTHENTICATED_PATH_SIGNALS.some((sig) => path.includes(sig));
  } catch {
    return true;
  }
}

/** True when the URL carries a query key known to create search / calendar / paging loops. */
export function isCrawlTrapUrl(url: string): boolean {
  try {
    const params = new URL(url).searchParams;
    for (const key of TRAP_QUERY_KEYS) {
      if (params.has(key)) return true;
    }
    return false;
  } catch {
    return true;
  }
}

/** True when the URL points at a non-textual asset (image/style/script/media/archive). */
export function isAssetUrl(url: string): boolean {
  try {
    const path = new URL(url).pathname.toLowerCase();
    return ASSET_EXTENSIONS.some((ext) => path.endsWith(ext));
  } catch {
    return true;
  }
}

/** True when the URL points at a PDF document. */
export function isPdfUrl(url: string): boolean {
  try {
    return new URL(url).pathname.toLowerCase().endsWith(".pdf");
  } catch {
    return false;
  }
}

export type CrawlSafetyVerdict =
  | { readonly allowed: true }
  | { readonly allowed: false; readonly reason: string };

/**
 * Full crawl-safety decision for a URL, layering the app's approved-domain/HTTPS rule with the
 * ingestion-only safety rules above. PDFs are permitted (documents are a first-class source);
 * other non-text assets are refused.
 */
export function assessCrawlSafety(url: string): CrawlSafetyVerdict {
  if (!isApprovedOfficialUrl(url)) {
    return { allowed: false, reason: "not an HTTPS URL on an approved official domain" };
  }
  if (isAuthenticatedHost(url)) {
    return { allowed: false, reason: "authenticated/identity portal host" };
  }
  if (isAuthenticatedPath(url)) {
    return { allowed: false, reason: "authenticated or student-specific path" };
  }
  if (isCrawlTrapUrl(url)) {
    return { allowed: false, reason: "search/calendar/pagination parameter loop" };
  }
  if (!isPdfUrl(url) && isAssetUrl(url)) {
    return { allowed: false, reason: "non-textual asset" };
  }
  return { allowed: true };
}
