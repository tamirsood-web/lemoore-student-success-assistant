// URL canonicalization + tracking-parameter removal (pure; server/script-only).
//
// Produces one stable, comparable form for a URL so that: (1) duplicate detection collapses
// the same page reached via tracking params, fragments, or default ports; (2) stored
// `canonical_url` metadata is clean; (3) printer-friendly / mobile variants map onto their
// canonical page. This never fabricates a different destination — it only strips noise the
// server would ignore anyway and normalizes case/ordering.

/** Query parameters that carry no page identity (analytics, ad-click, session, share ids). */
const TRACKING_PARAM_EXACT = new Set<string>([
  "gclid",
  "fbclid",
  "msclkid",
  "yclid",
  "dclid",
  "mc_cid",
  "mc_eid",
  "igshid",
  "ref",
  "ref_src",
  "referrer",
  "source",
  "campaign",
  "_ga",
  "_gl",
  "_hsenc",
  "_hsmi",
  "hsctatracking",
  "spm",
  "cmpid",
  "sessionid",
  "session_id",
  "sid",
  "phpsessid",
  "jsessionid",
  "cfid",
  "cftoken",
]);

/** Prefixes whose entire family is tracking noise (e.g. every `utm_*`). */
const TRACKING_PARAM_PREFIX = ["utm_", "pk_", "piwik_", "matomo_", "vero_"];

/**
 * Query parameters that select a duplicate rendering of the same content (printer-friendly /
 * plain / mobile variants). Removing them collapses the variant onto its canonical page.
 */
const DUPLICATE_VARIANT_PARAMS = new Map<string, string[]>([
  ["print", ["1", "true", "yes", "y"]],
  ["printable", ["1", "true", "yes", "y"]],
  ["print-friendly", ["1", "true", "yes", "y"]],
  ["output", ["print", "printer"]],
  ["format", ["print", "printer", "amp"]],
  ["view", ["print", "mobile"]],
  ["display", ["print", "mobile"]],
  ["m", ["1", "true", "mobile"]],
]);

function isTrackingKey(key: string): boolean {
  const lower = key.toLowerCase();
  if (TRACKING_PARAM_EXACT.has(lower)) return true;
  return TRACKING_PARAM_PREFIX.some((prefix) => lower.startsWith(prefix));
}

function isDuplicateVariantParam(key: string, value: string): boolean {
  const allowed = DUPLICATE_VARIANT_PARAMS.get(key.toLowerCase());
  return allowed ? allowed.includes(value.toLowerCase()) : false;
}

/** Options controlling how aggressively variants are normalized. */
export type CanonicalizeOptions = {
  /** Drop printer-friendly / mobile duplicate-variant query params (default true). */
  readonly stripVariantParams?: boolean;
};

/**
 * Return the canonical form of a URL: HTTPS, lowercase host, no fragment, no default port, no
 * tracking (and optionally no duplicate-variant) query params, remaining params sorted, and
 * collapsed duplicate slashes. Throws on an unparseable URL so callers can reject it.
 */
export function canonicalizeUrl(
  input: string,
  options: CanonicalizeOptions = {},
): string {
  const { stripVariantParams = true } = options;
  const url = new URL(input.trim());

  // Scheme + host normalization.
  if (url.protocol === "http:") url.protocol = "https:";
  url.hostname = url.hostname.toLowerCase();
  url.hash = "";
  if (
    (url.protocol === "https:" && url.port === "443") ||
    (url.protocol === "http:" && url.port === "80")
  ) {
    url.port = "";
  }

  // Collapse accidental duplicate slashes in the path (but keep a single leading slash).
  url.pathname = url.pathname.replace(/\/{2,}/g, "/");

  // Filter query params, then re-sort for a stable representation.
  const kept: Array<[string, string]> = [];
  for (const [key, value] of url.searchParams.entries()) {
    if (isTrackingKey(key)) continue;
    if (stripVariantParams && isDuplicateVariantParam(key, value)) continue;
    kept.push([key, value]);
  }
  kept.sort((a, b) => (a[0] === b[0] ? a[1].localeCompare(b[1]) : a[0].localeCompare(b[0])));
  url.search = "";
  for (const [key, value] of kept) url.searchParams.append(key, value);

  return url.toString();
}

/** Best-effort canonicalization that returns the original string if it cannot be parsed. */
export function tryCanonicalizeUrl(
  input: string,
  options?: CanonicalizeOptions,
): string {
  try {
    return canonicalizeUrl(input, options);
  } catch {
    return input;
  }
}

/** Remove only tracking parameters and the fragment, preserving everything else verbatim. */
export function stripTrackingParams(input: string): string {
  const url = new URL(input.trim());
  url.hash = "";
  const kept: Array<[string, string]> = [];
  for (const [key, value] of url.searchParams.entries()) {
    if (!isTrackingKey(key)) kept.push([key, value]);
  }
  url.search = "";
  for (const [key, value] of kept) url.searchParams.append(key, value);
  return url.toString();
}

/** True when two URLs resolve to the same canonical page. */
export function isSameCanonicalUrl(a: string, b: string): boolean {
  try {
    return canonicalizeUrl(a) === canonicalizeUrl(b);
  } catch {
    return false;
  }
}
