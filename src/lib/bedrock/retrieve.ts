// Mock retrieval behind the fixed `retrieve()` seam (server-only).
//
// Deterministic, local-only stand-in for a Bedrock Knowledge Base retrieve step. It reads
// ONLY the Group 4 mock data and makes no network/AWS calls. Query text is treated purely
// as data for matching — never as instructions (prompt-injection resilience).
//
// Four intents (checked in this priority order):
//   1. "location"    — deterministic lookup when the student asks where an office is.
//   2. "comparison"  — structured topic lookup when the student asks to compare concepts.
//   3. "course-date" — exact-identifier lookup over the course-date dataset.
//   4. "source"      — tag/keyword scoring over approved-source snippets with a threshold.

import type {
  RetrieveFn,
  RetrievalResult,
  RetrievedSnippet,
  Source,
  LocationCardData,
} from "@/types";
import {
  sources,
  courseDates,
  departments,
  getSourceById,
  isDepartmentId,
  MOCK_DATA_DISCLAIMER,
  COURSE_DATE_SOURCE_TITLE,
  findComparison,
} from "@/lib/mock";

const COURSE_DATE_SOURCE_ID = "src_course_dates_dataset";
const SOURCE_SCORE_THRESHOLD = 1;
const MAX_SOURCE_SNIPPETS = 3;

/** Words ignored when scoring source matches (articles, pronouns, common auxiliaries). */
const STOPWORDS = new Set([
  "a", "an", "the", "and", "or", "of", "to", "for", "in", "on", "at", "is", "are",
  "am", "was", "were", "be", "do", "does", "did", "how", "what", "when", "where",
  "which", "who", "whom", "i", "me", "my", "you", "your", "can", "could", "would",
  "should", "please", "about", "with", "there", "it", "this", "that",
]);

const COURSE_DATE_KEYWORDS = [
  "census date",
  "census",
  "drop date",
  "drop deadline",
  "withdraw",
  "withdrawal",
];

// ---------------------------------------------------------------------------
// Location intent detection
// ---------------------------------------------------------------------------

const LOCATION_TRIGGER_PHRASES = [
  "where is ",
  "where are ",
  "where do i go",
  "how do i get to",
  "directions to",
  "what building",
  "which building",
  "office location",
  "get to the office",
  "where should i go",
  "where to go for",
  "go for financial aid",
  "go for admissions",
  "go for counseling",
  "go for student services",
  "go for adult learner",
  "physically located",
  "in person at",
  "walk to",
  "campus location",
];

/**
 * Department name aliases used to identify which department a location query is about.
 * These are checked ONLY after isLocationIntent() returns true, so phrases here don't
 * need to be exhaustive — just precise enough to pick the right department.
 */
const LOCATION_DEPT_ALIASES: ReadonlyArray<{
  readonly phrases: readonly string[];
  readonly departmentId: string;
  readonly locationSourceId: string;
}> = [
  {
    phrases: ["admissions", "records", "admissions & records", "admissions and records", "registrar"],
    departmentId: "admissions_records",
    locationSourceId: "src_location_admissions",
  },
  {
    phrases: ["financial aid", "fafsa", "aid office", "fin aid"],
    departmentId: "financial_aid",
    locationSourceId: "src_location_financial_aid",
  },
  {
    phrases: ["counseling", "counselor", "counselling", "advising"],
    departmentId: "counseling",
    locationSourceId: "src_location_counseling",
  },
  {
    phrases: ["student services", "student service center"],
    departmentId: "student_services",
    locationSourceId: "src_location_student_services",
  },
  {
    phrases: ["adult learner", "adult learners", "adult education", "re-entry", "reentry", "returning student"],
    departmentId: "adult_learner_services",
    locationSourceId: "src_location_student_services",
  },
];

function isLocationIntent(query: string): boolean {
  const lower = query.toLowerCase();
  return LOCATION_TRIGGER_PHRASES.some((phrase) => lower.includes(phrase));
}

function buildLocationCardData(departmentId: string): LocationCardData | null {
  if (!isDepartmentId(departmentId)) return null;
  const dept = departments[departmentId];
  return {
    name: dept.name,
    building: dept.building,
    hours: dept.hours,
    phone: dept.phone,
    email: dept.email,
    url: dept.url,
    mapUrl: dept.mapUrl,
  };
}

function buildLocationResult(query: string): RetrievalResult {
  const lower = query.toLowerCase();

  // Try to identify which department is being asked about.
  for (const entry of LOCATION_DEPT_ALIASES) {
    const matched = entry.phrases.some((phrase) => lower.includes(phrase));
    if (!matched) continue;

    const source = getSourceById(entry.locationSourceId);
    if (!source || !("id" in source)) {
      // Source not found — unknown location, escalate.
      return { intent: "location", snippets: [] };
    }

    const snippet: RetrievedSnippet = {
      source,
      title: source.title,
      ...(source.uri ? { uri: source.uri } : {}),
      excerpt: source.content,
    };

    const locationCard = buildLocationCardData(entry.departmentId);
    return {
      intent: "location",
      snippets: [snippet],
      ...(locationCard ? { locationCard } : {}),
    };
  }

  // Location intent but unknown place — do not guess; escalate.
  return { intent: "location", snippets: [] };
}

// ---------------------------------------------------------------------------
// Comparison intent detection
// ---------------------------------------------------------------------------

const COMPARISON_TRIGGER_PHRASES = [
  "difference between",
  "differences between",
  "what is the difference",
  "what's the difference",
  "compare ",
  " vs ",
  " versus ",
  "drop vs",
  "drop versus",
  "census vs",
  "census versus",
  "in-person vs",
  "in person vs",
  "online vs",
];

function isComparisonIntent(query: string): boolean {
  const lower = query.toLowerCase();
  return COMPARISON_TRIGGER_PHRASES.some((phrase) => lower.includes(phrase));
}

function buildComparisonResult(query: string): RetrievalResult {
  const record = findComparison(query);
  if (!record) {
    // Comparison intent but unsupported topic — escalate.
    return { intent: "comparison", snippets: [] };
  }

  const source = getSourceById(record.sourceId);
  if (!source || !("id" in source)) {
    return { intent: "comparison", snippets: [] };
  }

  const snippet: RetrievedSnippet = {
    source,
    title: source.title,
    ...(source.uri ? { uri: source.uri } : {}),
    excerpt: source.content,
  };

  return {
    intent: "comparison",
    snippets: [snippet],
    comparisonBlock: record.data,
  };
}

// ---------------------------------------------------------------------------
// Course-date helpers (unchanged from original)
// ---------------------------------------------------------------------------

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 0);
}

function keywordsFor(source: Source): Set<string> {
  const words = new Set<string>();
  for (const tag of source.tags) {
    for (const word of tokenize(tag)) words.add(word);
  }
  for (const word of tokenize(source.title)) words.add(word);
  return words;
}

function isCourseDateIntent(query: string): boolean {
  const lower = query.toLowerCase();
  return COURSE_DATE_KEYWORDS.some((keyword) => lower.includes(keyword));
}

const SUBJECTS = new Set(courseDates.map((cd) => cd.subject));
const TERMS = Array.from(new Set(courseDates.map((cd) => cd.term)));

function parseSubject(tokens: string[]): string | undefined {
  for (const token of tokens) {
    const upper = token.toUpperCase();
    if (SUBJECTS.has(upper)) return upper;
  }
  return undefined;
}

function parseCatalogNumber(query: string): string | undefined {
  const match = query.match(/\b\d{3}\b/);
  return match ? match[0] : undefined;
}

function parseSection(query: string): string | undefined {
  const match = query.match(/\b(?:section|sec)\s*#?\s*(\d{1,3})\b/i);
  return match ? match[1] : undefined;
}

function parseTerm(query: string): string | undefined {
  const lower = query.toLowerCase();
  return TERMS.find((term) => lower.includes(term.toLowerCase()));
}

function buildCourseDateResult(query: string): RetrievalResult {
  const tokens = tokenize(query);
  const subject = parseSubject(tokens);
  const catalogNumber = parseCatalogNumber(query);
  const section = parseSection(query);
  const term = parseTerm(query);

  if (!subject || !catalogNumber) {
    return { intent: "course-date", snippets: [], needsIdentifiers: true };
  }

  let matches = courseDates.filter(
    (cd) => cd.subject === subject && cd.catalogNumber === catalogNumber,
  );
  if (section) {
    matches = matches.filter(
      (cd) => Number.parseInt(cd.section, 10) === Number.parseInt(section, 10),
    );
  }
  if (term) {
    matches = matches.filter((cd) => cd.term === term);
  }

  if (matches.length > 1) {
    return { intent: "course-date", snippets: [], needsIdentifiers: true };
  }

  const cd = matches[0];
  const datasetSource = getSourceById(COURSE_DATE_SOURCE_ID);
  if (matches.length === 1 && cd && datasetSource) {
    const excerpt = `${cd.subject} ${cd.catalogNumber} section ${cd.section}, ${cd.term}: start date ${cd.startDate}, census date ${cd.censusDate}, drop date ${cd.dropDate}. ${MOCK_DATA_DISCLAIMER}`;
    const snippet: RetrievedSnippet = {
      source: datasetSource,
      title: COURSE_DATE_SOURCE_TITLE,
      ...(datasetSource.uri ? { uri: datasetSource.uri } : {}),
      excerpt,
    };
    return { intent: "course-date", snippets: [snippet], needsIdentifiers: false };
  }

  return { intent: "course-date", snippets: [], needsIdentifiers: false };
}

// ---------------------------------------------------------------------------
// Source scoring (unchanged from original)
// ---------------------------------------------------------------------------

function buildSourceResult(query: string): RetrievalResult {
  const queryTokens = tokenize(query).filter((token) => !STOPWORDS.has(token));

  const scored = sources
    .map((source) => {
      const keywords = keywordsFor(source);
      let score = 0;
      for (const token of queryTokens) {
        if (keywords.has(token)) score += 1;
      }
      return { source, score };
    })
    .filter((entry) => entry.score >= SOURCE_SCORE_THRESHOLD)
    .sort((a, b) =>
      b.score !== a.score ? b.score - a.score : a.source.id.localeCompare(b.source.id),
    )
    .slice(0, MAX_SOURCE_SNIPPETS);

  const snippets: RetrievedSnippet[] = scored.map(({ source }) => ({
    source,
    title: source.title,
    ...(source.uri ? { uri: source.uri } : {}),
    excerpt: source.content,
  }));

  return { intent: "source", snippets };
}

// ---------------------------------------------------------------------------
// Main retrieve function — priority: location > comparison > course-date > source
// ---------------------------------------------------------------------------

/** Retrieve supporting snippets for a query from the local mock corpus. Deterministic. */
export const retrieve: RetrieveFn = async (query) => {
  // 1. Location intent — check first so "where is financial aid" doesn't fall into
  //    course-date or source scoring.
  if (isLocationIntent(query)) {
    return buildLocationResult(query);
  }

  // 2. Comparison intent — check before course-date since "drop vs withdraw" would
  //    otherwise hit the course-date keyword "withdraw".
  if (isComparisonIntent(query)) {
    const result = buildComparisonResult(query);
    // If the comparison is recognised, return it. If not (unsupported topic), fall
    // through to source scoring so the user at least gets some context or escalation.
    if (result.snippets.length > 0 || result.intent === "comparison") {
      return result;
    }
  }

  // 3. Course-date intent.
  if (isCourseDateIntent(query)) {
    return buildCourseDateResult(query);
  }

  // 4. General source scoring.
  return buildSourceResult(query);
};

/** Exposed for tests/callers that need the dataset source id. */
export { COURSE_DATE_SOURCE_ID };
