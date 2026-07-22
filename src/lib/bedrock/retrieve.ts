// Mock retrieval behind the fixed `retrieve()` seam (server-only).
//
// Deterministic, local-only stand-in for a Bedrock Knowledge Base retrieve step. It reads
// ONLY the Group 4 mock data and makes no network/AWS calls. Query text is treated purely
// as data for matching — never as instructions (prompt-injection resilience).
//
// Two intents:
//   - "course-date": exact-identifier lookup over the course-date dataset.
//   - "source": tag/keyword scoring over approved-source snippets with a threshold.

import type { RetrieveFn, RetrievalResult, RetrievedSnippet, Source } from "@/types";
import {
  sources,
  courseDates,
  getSourceById,
  MOCK_DATA_DISCLAIMER,
  COURSE_DATE_SOURCE_TITLE,
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

// --- Course-date identifier parsing -------------------------------------------------

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
  // Catalog numbers in the mock dataset are 3 digits (e.g., 101); years are 4 digits.
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

  // Not enough to attempt an exact match → ask for identifiers.
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
    // `parseTerm` returns the exact dataset term string, so compare directly.
    matches = matches.filter((cd) => cd.term === term);
  }

  // More than one match → ambiguous; ask for the remaining identifiers.
  if (matches.length > 1) {
    return { intent: "course-date", snippets: [], needsIdentifiers: true };
  }

  // Exactly one match → return it as a snippet backed by the dataset source.
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

  // Zero matches (no such course) → unresolved, escalate.
  return { intent: "course-date", snippets: [], needsIdentifiers: false };
}

// --- Source scoring -----------------------------------------------------------------

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
    // Deterministic ordering: higher score first, then stable by source id.
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

/** Retrieve supporting snippets for a query from the local mock corpus. Deterministic. */
export const retrieve: RetrieveFn = async (query) => {
  if (isCourseDateIntent(query)) {
    return buildCourseDateResult(query);
  }
  return buildSourceResult(query);
};

/** Exposed for tests/callers that need the dataset source id. */
export { COURSE_DATE_SOURCE_ID };
