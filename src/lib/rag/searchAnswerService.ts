// SearchAnswerService — the ONE shared answer pipeline (server-only, deterministic).
//
// Flow (product spec):
//   query → normalize/rewrite → privacy screen → retrieve official chunks → rerank pages →
//   sufficiency check → grounded answer + citations  |  clarification  |  unsupported.
//
// Both the website search and the floating assistant call this exact pipeline over the exact
// same official-source corpus, so their answers and citations are identical in provenance.
// Local mode makes no network/AWS calls and is fully usable offline and in tests.

import type { WebsiteSearchResponse, OfficialSourceCitation } from "@/types";
import { FALLBACK_MESSAGES } from "@/lib/fallback-messages";
import { rewriteQuery } from "./queryRewriter";
import { localRetriever, type KnowledgeRetriever } from "./retriever";
import { rerank, type RankedSource } from "./reranker";
import { generateGroundedAnswer } from "./answerGenerator";
import { toCitations } from "./citationMapper";
import { screenForSharedIdentifiers } from "./privacy";
import { DEFAULT_SUGGESTIONS } from "./examples";

/**
 * Evidence thresholds (tuned against the corpus scoring in retriever.ts, where a curated
 * topic hit is worth 5 and a title hit 3). A page is "strong" enough to answer/cite from
 * when it clears STRONG, or when it matched at least two distinct query terms.
 */
const STRONG_SCORE = 5;
const MIN_MATCHED_TERMS = 2;
const MAX_RELATED = 3;

const UNSUPPORTED_MESSAGE =
  `${FALLBACK_MESSAGES.noSearchResults.heading} ${FALLBACK_MESSAGES.noSearchResults.guidance}`;

const CLARIFICATION_MESSAGE =
  `${FALLBACK_MESSAGES.needsMoreInformation.heading} ${FALLBACK_MESSAGES.needsMoreInformation.guidance}`;

function isStrong(page: RankedSource): boolean {
  return page.score >= STRONG_SCORE || page.matchedTerms.length >= MIN_MATCHED_TERMS;
}

/** Build a clarification suggestion list from the weakly-ranked pages, then defaults. */
function suggestionsFrom(ranked: readonly RankedSource[]): string[] {
  const fromPages = ranked
    .slice(0, 3)
    .map((page) => `Tell me about ${page.source.title.split("|")[0]?.trim()}`);
  const merged = [...fromPages, ...DEFAULT_SUGGESTIONS];
  return Array.from(new Set(merged)).slice(0, 4);
}

export interface SearchAnswerService {
  /**
   * Answer a query. Async so the boundary is provider-agnostic: the local provider resolves
   * synchronously; the Bedrock provider awaits a network call. Both return the same contract.
   */
  answer(query: string): Promise<WebsiteSearchResponse>;
}

/** Create the shared answer service over a given retriever (defaults to the local one). */
export function createSearchAnswerService(
  retriever: KnowledgeRetriever = localRetriever,
): SearchAnswerService {
  return {
    // Async to match the provider boundary; the local pipeline resolves synchronously.
    async answer(rawQuery: string): Promise<WebsiteSearchResponse> {
      const query = rawQuery.trim();

      // 1. Privacy: block SHARED sensitive identifiers (never echo the value).
      const privacy = screenForSharedIdentifiers(query);
      if (privacy.sensitive) {
        return { kind: "unsupported", query, message: privacy.message, relatedResults: [] };
      }

      // 2. Normalize + retrieve + rerank.
      const rewritten = rewriteQuery(query);
      if (rewritten.terms.length === 0) {
        return {
          kind: "clarification",
          query,
          message: CLARIFICATION_MESSAGE,
          suggestedQuestions: [...DEFAULT_SUGGESTIONS],
        };
      }

      const scored = retriever.retrieve(rewritten);
      const ranked = rerank(scored);
      const best = ranked[0];

      // 3. No evidence at all → honest unsupported.
      if (!best) {
        return { kind: "unsupported", query, message: UNSUPPORTED_MESSAGE, relatedResults: [] };
      }

      // 4. Weak/ambiguous evidence → clarification with suggestions.
      if (!isStrong(best)) {
        return {
          kind: "clarification",
          query,
          message: CLARIFICATION_MESSAGE,
          suggestedQuestions: suggestionsFrom(ranked),
        };
      }

      // 5. Sufficient evidence → grounded answer + citations.
      const generated = generateGroundedAnswer(ranked, STRONG_SCORE);
      if (!generated) {
        return { kind: "unsupported", query, message: UNSUPPORTED_MESSAGE, relatedResults: [] };
      }

      const citations = toCitations(generated.citedSources);
      const citedIds = new Set(generated.citedSources.map((c) => c.source.id));
      const related: OfficialSourceCitation[] = toCitations(
        ranked.filter((p) => !citedIds.has(p.source.id) && isStrong(p)).slice(0, MAX_RELATED),
      );

      // Guaranteed non-empty (generateGroundedAnswer returns >=1 cited source).
      const [first, ...rest] = citations;
      if (!first) {
        return { kind: "unsupported", query, message: UNSUPPORTED_MESSAGE, relatedResults: [] };
      }

      return {
        kind: "answered",
        query,
        answer: generated.answer,
        citations: [first, ...rest],
        relatedResults: related,
      };
    },
  };
}

/** The default local shared answer service. */
export const searchAnswerService = createSearchAnswerService();
