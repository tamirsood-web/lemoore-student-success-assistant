// Retrieval-evaluation logic: scope filters, canonical-variant matching, cross-source
// deduplication, source-origin attribution, failure classification, and comparison building.
//
// PURE + server/script-only: this module performs NO network, AWS, or filesystem I/O and never
// reads process.env, so `npm test` can exercise every branch with zero live calls. Data-source
// IDs are passed in as arguments and are used ONLY to compare against the reserved metadata key
// returned by Bedrock; they are mapped to the labels "s3" | "crawler" | "unknown" and are NEVER
// stored on a result or emitted into a report. Callers are responsible for redaction of IDs.

import { tryCanonicalizeUrl } from "./canonicalize";
import { isApprovedOfficialUrl } from "./domains";
import { normalizeForCompare } from "./dedup";

// ---- Scopes ------------------------------------------------------------------------------

/** The three diagnostic retrieval scopes. Production uses "combined". */
export const RETRIEVAL_SCOPES = ["combined", "s3", "crawler"] as const;
export type RetrievalScope = (typeof RETRIEVAL_SCOPES)[number];

export function isRetrievalScope(value: string): value is RetrievalScope {
  return (RETRIEVAL_SCOPES as readonly string[]).includes(value);
}

/**
 * Bedrock's reserved metadata key that carries the data-source id of each retrieved chunk.
 * Used both to filter retrieval to one source and to attribute a combined-scope result to its
 * origin. The VALUE (the id itself) is a secret and must never be logged or written to a report.
 */
export const BEDROCK_DATA_SOURCE_METADATA_KEY = "x-amz-bedrock-kb-data-source-id";

// ---- Scope → retrieval filter ------------------------------------------------------------

/** Opaque data-source ids, supplied from the environment by the caller (never persisted). */
export type ScopeDataSourceIds = {
  readonly s3?: string;
  readonly crawler?: string;
};

/** A single-equality Bedrock retrieval filter on the reserved data-source-id key. */
export type DataSourceFilter = {
  readonly equals: { readonly key: string; readonly value: string };
};

export type ScopeFilterResult =
  | { readonly ok: true; readonly scope: RetrievalScope; readonly filter?: DataSourceFilter }
  | { readonly ok: false; readonly scope: RetrievalScope; readonly error: string };

/**
 * Resolve the retrieval filter for a scope:
 *  - combined → no filter (search the whole Knowledge Base);
 *  - s3       → require the S3 data-source id;
 *  - crawler  → require the web-crawler data-source id.
 * The crawler id is validated as REQUIRED only for the crawler scope (and the S3 id only for the
 * S3 scope), so combined retrieval never needs either id. The error string names the missing
 * ENV VARIABLE, never a value.
 */
export function resolveScopeFilter(
  scope: RetrievalScope,
  ids: ScopeDataSourceIds,
): ScopeFilterResult {
  if (scope === "combined") {
    return { ok: true, scope };
  }
  if (scope === "s3") {
    if (!ids.s3 || ids.s3.trim() === "") {
      return {
        ok: false,
        scope,
        error: "BEDROCK_DATA_SOURCE_ID is required for --scope s3 but is not set.",
      };
    }
    return { ok: true, scope, filter: { equals: { key: BEDROCK_DATA_SOURCE_METADATA_KEY, value: ids.s3 } } };
  }
  // crawler
  if (!ids.crawler || ids.crawler.trim() === "") {
    return {
      ok: false,
      scope,
      error: "BEDROCK_WEB_CRAWLER_DATA_SOURCE_ID is required for --scope crawler but is not set.",
    };
  }
  return {
    ok: true,
    scope,
    filter: { equals: { key: BEDROCK_DATA_SOURCE_METADATA_KEY, value: ids.crawler } },
  };
}

// ---- Canonical-variant URL matching ------------------------------------------------------

// Directory-index documents that resolve to their containing directory (e.g. `/a/index.php`
// === `/a/`). Collapsing these fixes evaluator "URL/title matching" errors where a curated
// expected URL (`/admissions/`) and its crawled twin (`/admissions/index.php`) were treated as
// different pages purely because of the index filename or a trailing slash.
const INDEX_FILE_RE = /\/(?:index|default)\.(?:php|html?|aspx|cfm|jsp)$/i;

/**
 * Reduce a URL to one comparable identity for evaluator matching. Builds on the shared
 * `canonicalizeUrl` (HTTPS, lowercase host, tracking params stripped) and additionally:
 * lowercases the path, drops a trailing `index.*`/`default.*` file, and removes a trailing
 * slash. It never changes the destination host or the meaningful path — only normalizes the
 * variations the college web server treats as the same page.
 */
export function canonicalUrlForMatch(input: string): string {
  const canon = tryCanonicalizeUrl(input);
  let url: URL;
  try {
    url = new URL(canon);
  } catch {
    return canon.trim().toLowerCase();
  }
  let path = url.pathname.toLowerCase();
  path = path.replace(INDEX_FILE_RE, "/");
  if (path.length > 1) path = path.replace(/\/+$/, "");
  return `${url.protocol}//${url.host}${path}${url.search}`;
}

/** True when a retrieved URL resolves to one of the expected source URLs (or their group). */
export function urlMatchesExpected(
  url: string | undefined,
  expected: readonly string[],
): boolean {
  if (!url) return false;
  const target = canonicalUrlForMatch(url);
  return expected.some((e) => canonicalUrlForMatch(e) === target);
}

/** Strict (pre-correction) match: exact canonical equality, no index/slash collapsing. */
export function urlMatchesExpectedStrict(
  url: string | undefined,
  expected: readonly string[],
): boolean {
  if (!url) return false;
  const target = tryCanonicalizeUrl(url);
  return expected.some((e) => tryCanonicalizeUrl(e) === target);
}

// ---- Source-origin attribution -----------------------------------------------------------

export type SourceOrigin = "s3" | "crawler" | "unknown";

/**
 * Attribute a retrieved chunk to its data source without ever exposing the id. Prefers the
 * reserved metadata key (matched against the supplied ids), then the retrieval location type
 * (S3 vs WEB), then the presence of an S3 URI / web URL. Returns a label only.
 */
export function classifyOrigin(input: {
  readonly dataSourceId?: string;
  readonly locationType?: string;
  readonly hasS3Uri?: boolean;
  readonly hasWebUrl?: boolean;
  readonly ids: ScopeDataSourceIds;
}): SourceOrigin {
  const { dataSourceId, locationType, hasS3Uri, hasWebUrl, ids } = input;
  if (dataSourceId) {
    if (ids.s3 && dataSourceId === ids.s3) return "s3";
    if (ids.crawler && dataSourceId === ids.crawler) return "crawler";
  }
  const type = locationType?.toUpperCase();
  if (type === "S3") return "s3";
  if (type === "WEB") return "crawler";
  if (hasS3Uri) return "s3";
  if (hasWebUrl) return "crawler";
  return "unknown";
}

// ---- Normalized results + deduplication --------------------------------------------------

/** One retrieved result, normalized to the privacy-safe fields the evaluator reports. */
export type RetrievedResult = {
  readonly rank: number;
  readonly title: string;
  readonly url?: string;
  readonly score?: number;
  readonly origin: SourceOrigin;
  readonly currentStatus?: string;
  /** True when a URL is present but is NOT an approved official URL (e.g. wrong campus). */
  readonly wrongCampus: boolean;
};

export type DedupedResult = RetrievedResult & {
  readonly origins: SourceOrigin[];
  /** True when the same page was retrieved from BOTH the S3 and crawler data sources. */
  readonly duplicateAcrossSources: boolean;
  readonly mergedRanks: number[];
};

export type DedupeOutcome = {
  readonly results: DedupedResult[];
  /** Number of result slots removed as duplicates. */
  readonly removed: number;
  /** Number of distinct pages that appeared in both S3 and crawler. */
  readonly crossSourceDuplicates: number;
};

/**
 * Collapse duplicate pages so the same official page is never shown or counted twice, even when
 * it arrives from two data sources. Identity is: (1) canonical official URL / normalized source
 * URL when a URL is present, else (2) a title + content-normalized fingerprint. The first (best-
 * ranked) occurrence is kept; later occurrences merge their origin into it. Order is preserved,
 * so the deduped rank is the index in the returned array.
 */
export function dedupeRetrieved(results: readonly RetrievedResult[]): DedupeOutcome {
  const byKey = new Map<string, DedupedResult>();
  const order: string[] = [];
  let removed = 0;

  for (const r of results) {
    const key = r.url
      ? `url:${canonicalUrlForMatch(r.url)}`
      : `title:${normalizeForCompare(r.title)}`;
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, {
        ...r,
        origins: [r.origin],
        duplicateAcrossSources: false,
        mergedRanks: [r.rank],
      });
      order.push(key);
      continue;
    }
    removed += 1;
    const origins = existing.origins.includes(r.origin)
      ? existing.origins
      : [...existing.origins, r.origin];
    byKey.set(key, {
      ...existing,
      origins,
      duplicateAcrossSources: origins.includes("s3") && origins.includes("crawler"),
      mergedRanks: [...existing.mergedRanks, r.rank],
    });
  }

  const deduped = order.map((k) => byKey.get(k)!);
  const crossSourceDuplicates = deduped.filter((r) => r.duplicateAcrossSources).length;
  return { results: deduped, removed, crossSourceDuplicates };
}

// ---- Staleness heuristic -----------------------------------------------------------------

/**
 * True when a result looks like archived / superseded content: an explicit historical status,
 * or a URL whose newest 4-digit year is at least three years older than the current year (old
 * catalog editions, prior-year addenda, dated self-study reports).
 */
export function looksStale(
  url: string | undefined,
  currentStatus: string | undefined,
  currentYear: number,
): boolean {
  if (currentStatus === "historical") return true;
  if (!url) return false;
  let path: string;
  try {
    path = new URL(url).pathname;
  } catch {
    path = url;
  }
  const years = (path.match(/\b(?:19|20)\d{2}\b/g) ?? [])
    .map((y) => Number.parseInt(y, 10))
    .filter((y) => y >= 1990 && y <= currentYear);
  if (years.length === 0) return false;
  return Math.max(...years) <= currentYear - 3;
}

// ---- Failure classification --------------------------------------------------------------

/** The full, closed set of failure classifications used across the diagnostics. */
export const FAILURE_CLASSIFICATIONS = [
  "evaluator-url-title-matching-error",
  "correct-source-ranked-too-low",
  "crawler-noise",
  "duplicate-s3-crawler-result",
  "wrong-topic",
  "wrong-campus",
  "stale-source",
  "missing-content",
  "genuine-retrieval-failure",
] as const;
export type FailureClassification = (typeof FAILURE_CLASSIFICATIONS)[number];

function firstPathSegment(url: string | undefined): string {
  if (!url) return "";
  try {
    return new URL(url).pathname.toLowerCase().split("/").filter(Boolean)[0] ?? "";
  } catch {
    return "";
  }
}

/**
 * Single-scope failure classification (no cross-scope knowledge). Given the deduped results for
 * one scope and whether the expected page matched, pick the most specific reason. The comparison
 * builder refines this with cross-scope signals (e.g. "correct-source-ranked-too-low").
 */
export function classifySingleScopeFailure(input: {
  readonly expectedSourceUrls: readonly string[];
  readonly deduped: DedupeOutcome;
  readonly currentYear: number;
}): FailureClassification {
  const { deduped, expectedSourceUrls, currentYear } = input;
  const results = deduped.results;
  const n = results.length;

  if (n === 0) return "missing-content";
  if (results.some((r) => r.wrongCampus)) return "wrong-campus";

  const staleCount = results.filter((r) => looksStale(r.url, r.currentStatus, currentYear)).length;
  if (staleCount / n >= 0.5) return "stale-source";

  if (deduped.crossSourceDuplicates >= 2) return "duplicate-s3-crawler-result";

  const crawlerCount = results.filter((r) => r.origin === "crawler").length;
  if (crawlerCount / n > 0.5) return "crawler-noise";

  // On-domain, current, not crawler-dominated: distinguish an unrelated top hit (wrong-topic)
  // from an on-topic page the retriever simply failed to surface (genuine retrieval failure).
  const expectedSegments = new Set(expectedSourceUrls.map(firstPathSegment).filter(Boolean));
  const topSegment = firstPathSegment(results[0]?.url);
  if (topSegment && expectedSegments.size > 0 && !expectedSegments.has(topSegment)) {
    return "wrong-topic";
  }
  return "genuine-retrieval-failure";
}

// ---- Per-question evaluation -------------------------------------------------------------

export type EvalQuestion = {
  readonly id: string;
  readonly question: string;
  readonly expectedTopic: string;
  readonly expectedSourceUrls: string[];
};

export type QuestionEval = {
  readonly id: string;
  readonly question: string;
  readonly expectedTopic: string;
  readonly expectedSourceGroup: string[];
  readonly scope: RetrievalScope;
  readonly usable: boolean;
  /** Deduped rank (1-based) of the first expected match, or null. */
  readonly rank: number | null;
  /** Raw (pre-dedup) rank of the first expected match, or null. */
  readonly rawRank: number | null;
  readonly returnedTitles: string[];
  readonly returnedUrls: string[];
  readonly returnedOrigins: SourceOrigin[];
  readonly topScore: number | null;
  readonly matchedScore: number | null;
  readonly matchedOrigin: SourceOrigin | null;
  readonly crossSourceDuplicates: number;
  readonly duplicatesRemoved: number;
  readonly wrongCampusWarning: boolean;
  readonly staleSourceWarning: boolean;
  /** True when the improved matcher made this usable but the strict matcher did not. */
  readonly evaluatorMatchingCorrected: boolean;
  readonly failureClassification: FailureClassification | null;
};

/** Evaluate one question against one scope's retrieved results. */
export function evaluateQuestion(input: {
  readonly question: EvalQuestion;
  readonly scope: RetrievalScope;
  readonly retrieved: readonly RetrievedResult[];
  readonly currentYear: number;
}): QuestionEval {
  const { question, scope, retrieved, currentYear } = input;
  const deduped = dedupeRetrieved(retrieved);

  const matchIndex = deduped.results.findIndex((r) => urlMatchesExpected(r.url, question.expectedSourceUrls));
  const usable = matchIndex !== -1;
  const matched = usable ? deduped.results[matchIndex] : undefined;

  const rawMatchIndex = retrieved.findIndex((r) => urlMatchesExpected(r.url, question.expectedSourceUrls));
  const strictUsable = retrieved.some((r) => urlMatchesExpectedStrict(r.url, question.expectedSourceUrls));

  const staleWarning = deduped.results.some((r) => looksStale(r.url, r.currentStatus, currentYear));

  return {
    id: question.id,
    question: question.question,
    expectedTopic: question.expectedTopic,
    expectedSourceGroup: question.expectedSourceUrls,
    scope,
    usable,
    rank: usable ? matchIndex + 1 : null,
    rawRank: rawMatchIndex === -1 ? null : rawMatchIndex + 1,
    returnedTitles: deduped.results.map((r) => r.title),
    returnedUrls: deduped.results.map((r) => r.url).filter((u): u is string => Boolean(u)),
    returnedOrigins: deduped.results.map((r) => r.origin),
    topScore: deduped.results[0]?.score ?? null,
    matchedScore: matched?.score ?? null,
    matchedOrigin: matched?.origin ?? null,
    crossSourceDuplicates: deduped.crossSourceDuplicates,
    duplicatesRemoved: deduped.removed,
    wrongCampusWarning: deduped.results.some((r) => r.wrongCampus),
    staleSourceWarning: staleWarning,
    evaluatorMatchingCorrected: usable && !strictUsable,
    failureClassification: usable
      ? null
      : classifySingleScopeFailure({
          expectedSourceUrls: question.expectedSourceUrls,
          deduped,
          currentYear,
        }),
  };
}

// ---- Cross-scope comparison --------------------------------------------------------------

export type ScopeReport = {
  readonly scope: RetrievalScope;
  readonly generatedAt: string;
  readonly total: number;
  readonly usable: number;
  readonly questions: QuestionEval[];
};

export type ComparisonRow = {
  readonly id: string;
  readonly question: string;
  readonly expectedTopic: string;
  readonly expectedSourceGroup: string[];
  readonly usableByScope: Record<RetrievalScope, boolean | null>;
  readonly rankByScope: Record<RetrievalScope, number | null>;
  readonly matchedOriginByScope: Record<RetrievalScope, SourceOrigin | null>;
  /** Refined classification for the COMBINED (production) scope, or null when usable. */
  readonly combinedFailureClassification: FailureClassification | null;
  readonly evaluatorMatchingCorrected: boolean;
};

export type TopicGroupComparison = {
  readonly topic: string;
  readonly total: number;
  readonly usableByScope: Record<RetrievalScope, number>;
  readonly betterSource: "s3" | "crawler" | "tie" | "neither";
};

export type Comparison = {
  readonly generatedAt: string;
  readonly knowledgeBaseId: "<redacted>";
  readonly dataSourceIds: "<redacted>";
  readonly scopesPresent: RetrievalScope[];
  readonly scopesMissing: RetrievalScope[];
  readonly totals: {
    readonly total: number;
    readonly usableByScope: Record<RetrievalScope, number | null>;
  };
  readonly failureCounts: Record<string, number>;
  readonly evaluatorMatchingCorrectedCount: number;
  readonly topicGroups: TopicGroupComparison[];
  readonly rows: ComparisonRow[];
};

function refineCombinedClassification(
  combined: QuestionEval | undefined,
  s3Usable: boolean | null,
  crawlerUsable: boolean | null,
): FailureClassification | null {
  if (!combined) return null;
  if (combined.usable) return null;
  // A source-scoped run found the expected page, but combined did not → the other source's
  // results displaced it out of the top-N.
  if (s3Usable === true || crawlerUsable === true) return "correct-source-ranked-too-low";
  return combined.failureClassification;
}

/**
 * Build the three-way comparison from whichever scope reports are available. Missing scopes are
 * recorded explicitly; their per-scope values are null (never silently treated as failures).
 */
export function buildComparison(
  reports: Partial<Record<RetrievalScope, ScopeReport>>,
  generatedAt: string,
): Comparison {
  const present = RETRIEVAL_SCOPES.filter((s) => reports[s]);
  const missing = RETRIEVAL_SCOPES.filter((s) => !reports[s]);

  // Index each scope's questions by id.
  const byScope = new Map<RetrievalScope, Map<string, QuestionEval>>();
  for (const scope of present) {
    byScope.set(scope, new Map(reports[scope]!.questions.map((q) => [q.id, q])));
  }

  // Establish the full question list + order from any present scope (prefer combined).
  const base = reports.combined ?? reports.s3 ?? reports.crawler;
  const questions = base ? base.questions : [];

  const rows: ComparisonRow[] = [];
  const failureCounts: Record<string, number> = {};
  let evaluatorCorrected = 0;

  for (const q of questions) {
    const get = (s: RetrievalScope) => byScope.get(s)?.get(q.id);
    const usableByScope = {
      combined: get("combined")?.usable ?? null,
      s3: get("s3")?.usable ?? null,
      crawler: get("crawler")?.usable ?? null,
    };
    const rankByScope = {
      combined: get("combined")?.rank ?? null,
      s3: get("s3")?.rank ?? null,
      crawler: get("crawler")?.rank ?? null,
    };
    const matchedOriginByScope = {
      combined: get("combined")?.matchedOrigin ?? null,
      s3: get("s3")?.matchedOrigin ?? null,
      crawler: get("crawler")?.matchedOrigin ?? null,
    };
    const combinedClass = refineCombinedClassification(
      get("combined"),
      usableByScope.s3,
      usableByScope.crawler,
    );
    if (combinedClass) failureCounts[combinedClass] = (failureCounts[combinedClass] ?? 0) + 1;

    const corrected = RETRIEVAL_SCOPES.some((s) => get(s)?.evaluatorMatchingCorrected);
    if (corrected) evaluatorCorrected += 1;

    rows.push({
      id: q.id,
      question: q.question,
      expectedTopic: q.expectedTopic,
      expectedSourceGroup: q.expectedSourceGroup,
      usableByScope,
      rankByScope,
      matchedOriginByScope,
      combinedFailureClassification: combinedClass,
      evaluatorMatchingCorrected: corrected,
    });
  }

  // Topic groups.
  const topics = new Map<string, ComparisonRow[]>();
  for (const row of rows) {
    if (!topics.has(row.expectedTopic)) topics.set(row.expectedTopic, []);
    topics.get(row.expectedTopic)!.push(row);
  }
  const topicGroups: TopicGroupComparison[] = [...topics.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([topic, groupRows]) => {
      const count = (scope: RetrievalScope) =>
        groupRows.filter((r) => r.usableByScope[scope] === true).length;
      const usableByScope = { combined: count("combined"), s3: count("s3"), crawler: count("crawler") };
      let betterSource: TopicGroupComparison["betterSource"];
      if (usableByScope.s3 === 0 && usableByScope.crawler === 0) betterSource = "neither";
      else if (usableByScope.s3 > usableByScope.crawler) betterSource = "s3";
      else if (usableByScope.crawler > usableByScope.s3) betterSource = "crawler";
      else betterSource = "tie";
      return { topic, total: groupRows.length, usableByScope, betterSource };
    });

  const usableTotals = (scope: RetrievalScope): number | null =>
    reports[scope] ? reports[scope]!.usable : null;

  return {
    generatedAt,
    knowledgeBaseId: "<redacted>",
    dataSourceIds: "<redacted>",
    scopesPresent: present,
    scopesMissing: missing,
    totals: {
      total: questions.length,
      usableByScope: { combined: usableTotals("combined"), s3: usableTotals("s3"), crawler: usableTotals("crawler") },
    },
    failureCounts,
    evaluatorMatchingCorrectedCount: evaluatorCorrected,
    topicGroups,
    rows,
  };
}

// ---- Markdown rendering ------------------------------------------------------------------

function fmtCount(value: number | null): string {
  return value === null ? "—" : String(value);
}

function fmtUsable(value: boolean | null): string {
  if (value === null) return "—";
  return value ? "✅" : "❌";
}

function fmtRank(value: number | null): string {
  return value === null ? "" : `#${value}`;
}

/** Render the comparison as a privacy-safe Markdown report (no KB / data-source ids). */
export function renderComparisonMarkdown(cmp: Comparison): string {
  const lines: string[] = [
    "# Lemoore retrieval three-way comparison",
    "",
    `Generated: ${cmp.generatedAt}`,
    "",
    "> Diagnostic only. Production retrieval uses the **combined** scope (no data-source filter).",
    "> Knowledge Base id and data-source ids are redacted from this report.",
    "",
    `Scopes present: ${cmp.scopesPresent.join(", ") || "(none)"}` +
      (cmp.scopesMissing.length ? ` — missing: ${cmp.scopesMissing.join(", ")}` : ""),
    "",
    "## Usable totals by scope",
    "",
    "| Scope | Usable / Total |",
    "| --- | --- |",
    `| combined | ${fmtCount(cmp.totals.usableByScope.combined)} / ${cmp.totals.total} |`,
    `| s3 | ${fmtCount(cmp.totals.usableByScope.s3)} / ${cmp.totals.total} |`,
    `| crawler | ${fmtCount(cmp.totals.usableByScope.crawler)} / ${cmp.totals.total} |`,
    "",
    `Evaluator matching-corrected questions: ${cmp.evaluatorMatchingCorrectedCount}`,
    "",
    "## Combined-scope failure classifications",
    "",
    "| Classification | Count |",
    "| --- | --- |",
  ];
  const failureEntries = Object.entries(cmp.failureCounts).sort((a, b) => b[1] - a[1]);
  if (failureEntries.length === 0) lines.push("| (none) | 0 |");
  for (const [cls, count] of failureEntries) lines.push(`| ${cls} | ${count} |`);

  lines.push(
    "",
    "## Which source performed better, by topic group",
    "",
    "| Topic | Total | combined | s3 | crawler | Better source |",
    "| --- | --- | --- | --- | --- | --- |",
  );
  for (const g of cmp.topicGroups) {
    lines.push(
      `| ${g.topic} | ${g.total} | ${g.usableByScope.combined} | ${g.usableByScope.s3} | ${g.usableByScope.crawler} | ${g.betterSource} |`,
    );
  }

  lines.push(
    "",
    "## Per-question results",
    "",
    "| ID | Topic | combined | s3 | crawler | Combined rank | Origin | Combined failure |",
    "| --- | --- | --- | --- | --- | --- | --- | --- |",
  );
  for (const r of cmp.rows) {
    lines.push(
      `| ${r.id} | ${r.expectedTopic} | ${fmtUsable(r.usableByScope.combined)} | ${fmtUsable(r.usableByScope.s3)} | ` +
        `${fmtUsable(r.usableByScope.crawler)} | ${fmtRank(r.rankByScope.combined)} | ${r.matchedOriginByScope.combined ?? ""} | ` +
        `${r.combinedFailureClassification ?? ""} |`,
    );
  }
  lines.push("");
  return lines.join("\n");
}
