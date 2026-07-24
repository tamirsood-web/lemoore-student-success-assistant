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
import { classifyIntent } from "./intentClassifier";
import { rewriteForConversation, type ConversationTurn } from "./conversationRewriter";
import { normalizeQuery } from "./queryNormalizer";

// ---------------------------------------------------------------------------
// Emotional-support source validation (strict)
// ---------------------------------------------------------------------------

/**
 * Patterns that indicate a source EXPLICITLY provides emotional, personal,
 * or mental-health support. A generic "counseling" or "student services"
 * department is NOT sufficient — the content must describe the actual service.
 */
const EMOTIONAL_SUPPORT_CONTENT_PATTERNS: readonly RegExp[] = [
  /\bpersonal counseling\b/i,
  /\bmental[- ]health\b/i,
  /\bpsycholog(ical|y|ist)\b/i,
  /\bemotional (support|counseling|well-?being)\b/i,
  /\bcrisis (intervention|support|counsel)\b/i,
  /\bbehavioral[- ]health\b/i,
  /\bstudent (wellness|well-?being)\b/i,
  /\bconfidential (counseling|support)\b/i,
  /\btherapist\b/i,
  /\btherapy\b/i,
  /\banxiety\b/i,
  /\bdepression\b/i,
  /\bstress management\b/i,
];

/**
 * Terms that indicate a page is ONLY about academic services and should NOT
 * be used for emotional-support answers, even if it contains "counseling."
 */
const ACADEMIC_ONLY_INDICATORS: readonly RegExp[] = [
  /\beducational planning\b/i,
  /\bcourse selection\b/i,
  /\bdegree (requirements?|planning)\b/i,
  /\btransfer (planning|counseling)\b/i,
  /\bcareer (services?|assessments?|counseling)\b/i,
  /\bacademic (major|advising|recovery|counseling)\b/i,
  /\bprobation\b/i,
];

/**
 * Strictly validate whether a source explicitly provides emotional/mental-health support.
 * Returns true ONLY if the content mentions personal/emotional/mental-health counseling.
 * A page that only describes academic counseling is rejected even if its topic is "counseling."
 */
function isVerifiedEmotionalSupportSource(content: string): boolean {
  // Must match at least one explicit emotional-support pattern.
  const hasEmotionalContent = EMOTIONAL_SUPPORT_CONTENT_PATTERNS.some((p) => p.test(content));
  if (hasEmotionalContent) return true;

  // If the page ONLY has academic-counseling indicators and no emotional ones, reject it.
  return false;
}

/**
 * Filter ranked sources for emotional-support queries with strict content validation.
 * Only allows pages that explicitly describe emotional, personal, or mental-health services.
 */
function filterForEmotionalSupport(ranked: readonly RankedSource[]): RankedSource[] {
  return ranked.filter((page) => isVerifiedEmotionalSupportSource(page.source.content));
}

/** Empathetic fallback message for emotional-support queries with no appropriate source. */
const EMOTIONAL_SUPPORT_FALLBACK =
  "I'm sorry you're having a difficult time. I wasn't able to find specific mental-health or counseling service details in the available official sources.\n\n" +
  "For support, please contact Lemoore College Student Services:\n\n" +
  "Phone: (559) 925-3000\nEmail: lemoorehelpdesk@whccd.edu\nHours: Monday–Friday, 8:00 a.m.–5:00 p.m.\nLocation: 555 College Avenue, Building 100";

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
   * Optional `history` enables conversation-aware query rewriting for follow-up questions.
   */
  answer(query: string, history?: readonly ConversationTurn[]): Promise<WebsiteSearchResponse>;
}

/** Create the shared answer service over a given retriever (defaults to the local one). */
export function createSearchAnswerService(
  retriever: KnowledgeRetriever = localRetriever,
): SearchAnswerService {
  return {
    // Async to match the provider boundary; the local pipeline resolves synchronously.
    async answer(rawQuery: string, history?: readonly ConversationTurn[]): Promise<WebsiteSearchResponse> {
      const query = rawQuery.trim();

      // -1. Query normalization: correct obvious typos before intent classification.
      const normalization = normalizeQuery(query);
      const effectiveQuery = normalization.status === "corrected"
        ? normalization.normalizedText
        : query;
      if (normalization.status === "corrected") {
        console.info("[search:normalize]", { original: query, normalized: effectiveQuery, corrections: normalization.corrections });
      }

      // 0. Intent classification: route conversational messages before retrieval.
      const classification = classifyIntent(effectiveQuery);
      if (!classification.requiresRetrieval && classification.response) {
        return {
          kind: "conversational",
          query,
          message: classification.response,
          intent: classification.intent,
        };
      }

      // 0.5. Conversation-aware query rewriting: expand follow-up questions.
      const rewrite = rewriteForConversation(effectiveQuery, history ?? []);
      const searchQuery = rewrite.searchQuery;
      if (rewrite.wasRewritten) {
        console.info("[search:rewrite]", { original: rewrite.originalQuery, rewritten: searchQuery });
      }

      // 1. Privacy: block SHARED sensitive identifiers (never echo the value).
      const privacy = screenForSharedIdentifiers(searchQuery);
      if (privacy.sensitive) {
        return { kind: "unsupported", query, message: privacy.message, relatedResults: [] };
      }

      // 2. Normalize + retrieve + rerank.
      const rewritten = rewriteQuery(searchQuery);
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

      // 2.5. Emotional-support source filtering: only allow counseling/wellbeing sources.
      const effectiveRanked = classification.intent === "emotional_support"
        ? filterForEmotionalSupport(ranked)
        : ranked;
      const best = effectiveRanked[0];

      // 3. No evidence at all → honest unsupported.
      if (!best) {
        // For emotional-support queries, use an empathetic fallback.
        if (classification.intent === "emotional_support") {
          return { kind: "conversational", query, message: EMOTIONAL_SUPPORT_FALLBACK, intent: "emotional_support" };
        }
        return { kind: "unsupported", query, message: UNSUPPORTED_MESSAGE, relatedResults: [] };
      }

      // 4. Weak/ambiguous evidence → clarification with suggestions.
      if (!isStrong(best)) {
        if (classification.intent === "emotional_support") {
          return { kind: "conversational", query, message: EMOTIONAL_SUPPORT_FALLBACK, intent: "emotional_support" };
        }
        return {
          kind: "clarification",
          query,
          message: CLARIFICATION_MESSAGE,
          suggestedQuestions: suggestionsFrom(effectiveRanked),
        };
      }

      // 5. Sufficient evidence → grounded answer + citations.
      const generated = generateGroundedAnswer(effectiveRanked, STRONG_SCORE, effectiveQuery);
      if (!generated) {
        return { kind: "unsupported", query, message: UNSUPPORTED_MESSAGE, relatedResults: [] };
      }

      const citations = toCitations(generated.citedSources);
      const citedIds = new Set(generated.citedSources.map((c) => c.source.id));
      const related: OfficialSourceCitation[] = toCitations(
        effectiveRanked.filter((p) => !citedIds.has(p.source.id) && isStrong(p)).slice(0, MAX_RELATED),
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
