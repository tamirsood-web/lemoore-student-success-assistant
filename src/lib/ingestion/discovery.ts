// URL-discovery helpers: sitemap + link parsing, candidate classification (pure; script-only).
//
// Powers `sources:discover`. It parses official sitemaps and approved-seed links into CANDIDATE
// records with a recommended include/exclude verdict — but it never enables anything. A human
// must add/enable a candidate in the manifest before it can be downloaded or uploaded.

import { assessCrawlSafety, isPdfUrl } from "./domains";
import { tryCanonicalizeUrl, isSameCanonicalUrl } from "./canonicalize";
import { assessHistorical } from "./historical";

/** Parse a sitemap.xml body into loc + optional lastmod entries. */
export function parseSitemap(xml: string): Array<{ loc: string; lastmod?: string }> {
  const entries: Array<{ loc: string; lastmod?: string }> = [];
  const blockRe = /<url\b[\s\S]*?<\/url>/gi;
  let block: RegExpExecArray | null;
  while ((block = blockRe.exec(xml)) !== null) {
    const chunk = block[0];
    const loc = /<loc>\s*([\s\S]*?)\s*<\/loc>/i.exec(chunk)?.[1];
    if (!loc) continue;
    const lastmod = /<lastmod>\s*([\s\S]*?)\s*<\/lastmod>/i.exec(chunk)?.[1];
    entries.push({ loc: decodeXml(loc.trim()), lastmod: lastmod?.trim() });
  }
  // Also support sitemap index files that only list <sitemap><loc>…
  if (entries.length === 0) {
    const locRe = /<loc>\s*([\s\S]*?)\s*<\/loc>/gi;
    let m: RegExpExecArray | null;
    while ((m = locRe.exec(xml)) !== null) {
      entries.push({ loc: decodeXml((m[1] ?? "").trim()) });
    }
  }
  return entries;
}

function decodeXml(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
}

/** Extract absolute, http(s) links from an HTML page, resolved against `baseUrl`. */
export function extractLinks(html: string, baseUrl: string): string[] {
  const hrefs = new Set<string>();
  const re = /<a\b[^>]*\bhref\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const raw = (m[2] ?? m[3] ?? m[4] ?? "").trim();
    if (!raw || raw.startsWith("#") || raw.startsWith("javascript:") || raw.startsWith("mailto:") || raw.startsWith("tel:")) {
      continue;
    }
    try {
      const abs = new URL(raw, baseUrl);
      if (abs.protocol === "http:" || abs.protocol === "https:") {
        abs.hash = "";
        hrefs.add(abs.toString());
      }
    } catch {
      // ignore unparseable hrefs
    }
  }
  return Array.from(hrefs);
}

/** A guess table: URL path keyword → (topic, department). First match wins. */
const TOPIC_GUESSES: Array<{ re: RegExp; topic: string; department: string }> = [
  { re: /financial-aid|fafsa|dream-act/, topic: "financial-aid", department: "Financial Aid" },
  { re: /scholarship|grant/, topic: "grants-and-scholarships", department: "Financial Aid" },
  { re: /cost-of-attendance|tuition|fee|refund|payment/, topic: "cost-of-attendance", department: "Financial Aid" },
  { re: /transcript/, topic: "transcripts", department: "Admissions and Records" },
  { re: /academic-calendar|calendar/, topic: "academic-calendar", department: "Admissions and Records" },
  { re: /catalog/, topic: "catalog", department: "Admissions and Records" },
  { re: /schedule/, topic: "registration", department: "Admissions and Records" },
  { re: /dual-enrollment/, topic: "dual-enrollment", department: "Admissions" },
  { re: /orientation/, topic: "orientation", department: "Admissions" },
  { re: /admission|apply|future-students|returning-students/, topic: "admissions", department: "Admissions" },
  { re: /counsel/, topic: "counseling", department: "Counseling" },
  { re: /tutor/, topic: "tutoring", department: "Academic Support" },
  { re: /library/, topic: "library", department: "Library" },
  { re: /transfer/, topic: "transfer", department: "Transfer Center" },
  { re: /career/, topic: "career-services", department: "Career Center" },
  { re: /veteran|military/, topic: "veterans", department: "Veterans Services" },
  { re: /disabled-student|dsps/, topic: "dsps", department: "DSPS" },
  { re: /eops/, topic: "eops", department: "EOPS" },
  { re: /calworks/, topic: "calworks", department: "CalWORKs" },
  { re: /basic-needs|pantry|food/, topic: "basic-needs", department: "Basic Needs" },
  { re: /mental-health|health/, topic: "mental-health", department: "Student Health" },
  { re: /dream-resource/, topic: "dream-resource-center", department: "Dream Resource Center" },
  { re: /portal/, topic: "student-portal", department: "Information Technology" },
  { re: /helpdesk|help-desk/, topic: "helpdesk", department: "Information Technology" },
  { re: /contact|directory/, topic: "campus-contact", department: "Campus" },
  { re: /\/map/, topic: "campus-map", department: "Campus" },
  { re: /degrees-and-certificates|program/, topic: "degrees-and-certificates", department: "Academics" },
  { re: /graduat/, topic: "graduation", department: "Admissions and Records" },
];

/** Guess a likely topic + department from a URL path (best-effort; for review only). */
export function guessTopicDepartment(url: string): { topic: string; department: string } {
  let path = url.toLowerCase();
  try {
    path = new URL(url).pathname.toLowerCase();
  } catch {
    /* keep raw */
  }
  for (const guess of TOPIC_GUESSES) {
    if (guess.re.test(path)) return { topic: guess.topic, department: guess.department };
  }
  return { topic: "unknown", department: "Unknown" };
}

export type DiscoveredCandidate = {
  readonly url: string;
  readonly canonicalUrl: string;
  readonly referrer: string;
  readonly detectedTitle: string;
  readonly httpStatus: number | "unknown";
  readonly likelyTopic: string;
  readonly likelyDepartment: string;
  readonly historicalWarning: string;
  readonly duplicateWarning: string;
  readonly recommendation: "include" | "exclude";
  readonly recommendationReason: string;
  readonly isPdf: boolean;
};

/**
 * Classify a discovered URL into a review candidate. Pure: the caller supplies any HTTP status,
 * detected title, and lastmod. It never enables the candidate — `recommendation` is advisory.
 */
export function classifyCandidate(input: {
  readonly url: string;
  readonly referrer: string;
  readonly detectedTitle?: string;
  readonly httpStatus?: number;
  readonly lastmod?: string;
  readonly existingCanonicalUrls: readonly string[];
  readonly currentYear: number;
}): DiscoveredCandidate {
  const canonicalUrl = tryCanonicalizeUrl(input.url);
  const safety = assessCrawlSafety(input.url);
  const { topic, department } = guessTopicDepartment(input.url);

  const duplicate = input.existingCanonicalUrls.some((u) => isSameCanonicalUrl(u, input.url));
  const historical = assessHistorical({
    url: input.url,
    title: input.detectedTitle ?? "",
    text: `${input.detectedTitle ?? ""} ${input.lastmod ?? ""}`,
    topic,
    currentYear: input.currentYear,
  });

  let recommendation: "include" | "exclude" = "include";
  let reason = "on approved domain; not a known duplicate";
  if (!safety.allowed) {
    recommendation = "exclude";
    reason = safety.reason;
  } else if (duplicate) {
    recommendation = "exclude";
    reason = "already present in the manifest/corpus";
  } else if (historical.historical) {
    recommendation = "exclude";
    reason = `possible historical/stale content: ${historical.reasons.join("; ")}`;
  } else if (typeof input.httpStatus === "number" && (input.httpStatus < 200 || input.httpStatus >= 400)) {
    recommendation = "exclude";
    reason = `HTTP ${input.httpStatus}`;
  } else if (topic === "unknown") {
    recommendation = "exclude";
    reason = "could not map to a student-information topic";
  }

  return {
    url: input.url,
    canonicalUrl,
    referrer: input.referrer,
    detectedTitle: input.detectedTitle ?? "",
    httpStatus: input.httpStatus ?? "unknown",
    likelyTopic: topic,
    likelyDepartment: department,
    historicalWarning: historical.historical ? historical.reasons.join("; ") : "",
    duplicateWarning: duplicate ? "duplicate of an existing manifest/corpus URL" : "",
    recommendation,
    recommendationReason: reason,
    isPdf: isPdfUrl(input.url),
  };
}
