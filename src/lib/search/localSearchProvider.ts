// Local website-search provider (LOCAL DEMO DATA, runs client- or server-side).
//
// A deterministic stand-in for a managed semantic search backend. It reads ONLY the mock
// knowledge base (src/lib/mock) and makes no network/AWS calls. It fulfils the
// `SearchProvider` seam (src/types/search.ts), so a future Amazon Bedrock Knowledge Base
// provider can replace it without touching the UI — see docs/INTEGRATIONS.md.
//
// Query text is treated purely as data for matching. Two lightweight strategies are blended
// so the UI can demonstrate both a keyword and a (interface-level) semantic match:
//   - keyword: overlap of query tokens with a source's tags/title.
//   - semantic: query tokens found in the source body, or via a small synonym map, i.e.
//     matches that keyword overlap alone would miss. This is a demo stand-in for embedding
//     similarity; the real semantic ranking arrives with the Knowledge Base provider.

import type {
  SearchProvider,
  SearchQuery,
  SearchResponse,
  SearchResult,
  Source,
} from "@/types";
import { sources, departments, isDepartmentId } from "@/lib/mock";

const DEFAULT_LIMIT = 8;

/** Words ignored when scoring (mirrors the retrieval tokenizer's intent). */
const STOPWORDS = new Set([
  "a", "an", "the", "and", "or", "of", "to", "for", "in", "on", "at", "is", "are",
  "am", "was", "were", "be", "do", "does", "did", "how", "what", "when", "where",
  "which", "who", "whom", "i", "me", "my", "you", "your", "can", "could", "would",
  "should", "please", "about", "with", "there", "it", "this", "that", "find", "get",
]);

/**
 * Small synonym map so common student phrasing reaches the right topic even when it shares
 * no literal token with the source (a demo stand-in for semantic recall). Keys and values
 * are lowercase single tokens compared against source keywords/content tokens.
 */
const SYNONYMS: Readonly<Record<string, readonly string[]>> = {
  money: ["financial", "aid", "grants", "scholarships"],
  cost: ["tuition", "financial", "residency"],
  fafsa: ["financial", "aid", "grants"],
  enroll: ["registration", "register", "admissions", "enrollment"],
  signup: ["registration", "register"],
  wifi: ["email", "canvas", "login"],
  login: ["email", "canvas", "account", "password"],
  password: ["email", "account", "login"],
  class: ["registration", "courses", "canvas"],
  classes: ["registration", "courses", "canvas"],
  deadline: ["census", "drop", "calendar", "dates"],
  car: ["parking", "permit"],
  disability: ["dsps", "accommodations"],
  job: ["career", "jobs", "internship"],
  tutor: ["tutoring", "support"],
};

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 0);
}

/** Keyword surface for a source: tokens from its tags and title. */
function keywordSet(source: Source): Set<string> {
  const words = new Set<string>();
  for (const tag of source.tags) {
    for (const word of tokenize(tag)) words.add(word);
  }
  for (const word of tokenize(source.title)) words.add(word);
  return words;
}

/** Human-readable category label for a source (its owning department's name). */
function categoryFor(source: Source): string {
  return isDepartmentId(source.department)
    ? departments[source.department].name
    : "Student Services";
}

/** Trim the source content into a short, disclaimer-free-ish snippet for display. */
function snippetFor(source: Source): string {
  const firstSentence = source.content.split(". ")[0]?.trim() ?? source.content;
  return firstSentence.endsWith(".") ? firstSentence : `${firstSentence}.`;
}

type Scored = {
  readonly source: Source;
  readonly keywordHits: number;
  readonly semanticHits: number;
};

function scoreSource(source: Source, queryTokens: readonly string[]): Scored {
  const keywords = keywordSet(source);
  const contentTokens = new Set(tokenize(source.content));

  let keywordHits = 0;
  let semanticHits = 0;

  for (const token of queryTokens) {
    if (keywords.has(token)) {
      keywordHits += 1;
      continue;
    }
    // Semantic-ish: token appears only in the body, or a synonym does.
    if (contentTokens.has(token)) {
      semanticHits += 1;
      continue;
    }
    const synonyms = SYNONYMS[token];
    if (synonyms?.some((syn) => keywords.has(syn) || contentTokens.has(syn))) {
      semanticHits += 1;
    }
  }

  return { source, keywordHits, semanticHits };
}

function toResult(scored: Scored, maxRaw: number): SearchResult {
  const { source, keywordHits, semanticHits } = scored;
  // Keyword hits weigh more than semantic hits; normalize to [0, 1].
  const raw = keywordHits * 2 + semanticHits;
  const score = maxRaw > 0 ? Math.min(1, raw / maxRaw) : 0;
  return {
    id: source.id,
    title: source.title,
    category: categoryFor(source),
    snippet: snippetFor(source),
    ...(source.uri ? { url: source.uri } : {}),
    score,
    matchKind: keywordHits > 0 ? "keyword" : "semantic",
  };
}

/**
 * Build the local provider. Deterministic: identical queries yield identical responses, and
 * ties break by source id so ordering is stable.
 */
export function createLocalSearchProvider(): SearchProvider {
  return {
    name: "local-mock",
    async search(query: SearchQuery): Promise<SearchResponse> {
      const text = query.text.trim();
      const limit = query.limit ?? DEFAULT_LIMIT;
      if (text.length === 0) {
        return { query: text, results: [], totalMatches: 0 };
      }

      const queryTokens = tokenize(text).filter((t) => !STOPWORDS.has(t));
      const scored = sources
        .map((source) => scoreSource(source, queryTokens))
        .filter((entry) => entry.keywordHits + entry.semanticHits > 0);

      const maxRaw = scored.reduce(
        (max, entry) => Math.max(max, entry.keywordHits * 2 + entry.semanticHits),
        0,
      );

      const ranked = scored
        .map((entry) => toResult(entry, maxRaw))
        .sort((a, b) =>
          b.score !== a.score ? b.score - a.score : a.id.localeCompare(b.id),
        );

      return {
        query: text,
        results: ranked.slice(0, limit),
        totalMatches: ranked.length,
      };
    },
  };
}
