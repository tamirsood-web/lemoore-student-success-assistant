// Official-source knowledge + website-search response contract.
//
// This is the permanent wire contract for the AI website search and the redesigned
// floating assistant. Both features share ONE answer pipeline and ONE official-source
// collection; this file defines the shapes that flow through that pipeline.
//
// Grounding rule (AGENTS.md §9): every `answered` response must carry at least one
// citation that resolves to a real official source. The union models the honest
// non-answer states explicitly so the UI switches on `kind` rather than parsing text.

import type { NonEmptyReadonlyArray } from "./assistant";

/** A retrievable chunk of an official page. `id` is `${sourceId}#${index}`. */
export type OfficialChunk = {
  readonly id: string;
  readonly text: string;
};

/**
 * A single official page in the curated corpus. `content` and `chunks` are the ONLY text
 * the pipeline may use to compose an answer, and `url` is the canonical official source a
 * citation links to. `sourceType` is fixed so nothing but real web pages enter the corpus.
 */
export type OfficialSource = {
  readonly id: string;
  readonly title: string;
  readonly url: string;
  readonly department: string;
  readonly topic: string;
  readonly sourceType: "official-web-page";
  /** ISO date the page was last ingested, when available. */
  readonly lastIngested?: string;
  readonly content: string;
  readonly chunks: readonly OfficialChunk[];
};

/**
 * A citation shown next to a search/chat answer. Every field points at real official
 * material: when present, `url` MUST be an approved-domain HTTPS URL and `excerpt` is
 * verbatim source text. `url` is optional: an official source document may support the
 * answer without exposing an approved public webpage link (e.g. a Bedrock reference whose
 * only locator is internal). In that case the title + excerpt are shown and no link is
 * invented.
 */
export type OfficialSourceCitation = {
  readonly id: string;
  readonly title: string;
  readonly url?: string;
  readonly excerpt: string;
  readonly department?: string;
};

/** Provider mode selected by `RAG_PROVIDER`. Local mode is fully offline. */
export type RagProvider = "local" | "bedrock";

/**
 * The response returned by the shared answer pipeline (`POST /api/search`), consumed by
 * both the website search UI and the floating assistant. An explicit discriminated union:
 *
 *  - `conversational` — a non-retrieval response to greetings, thanks, goodbyes, etc.
 *  - `answered`       — a grounded answer with >=1 citation to official pages.
 *  - `clarification`  — the query is ambiguous/underspecified; suggest better questions.
 *  - `unsupported`    — no official source can verify an answer (honest non-answer).
 *  - `error`          — the request could not be processed.
 */
export type WebsiteSearchResponse =
  | {
      readonly kind: "conversational";
      readonly query: string;
      readonly message: string;
      readonly intent: string;
    }
  | {
      readonly kind: "answered";
      readonly query: string;
      readonly answer: string;
      readonly citations: NonEmptyReadonlyArray<OfficialSourceCitation>;
      readonly relatedResults: readonly OfficialSourceCitation[];
    }
  | {
      readonly kind: "clarification";
      readonly query: string;
      readonly message: string;
      readonly suggestedQuestions: readonly string[];
    }
  | {
      readonly kind: "unsupported";
      readonly query: string;
      readonly message: string;
      readonly relatedResults: readonly OfficialSourceCitation[];
    }
  | {
      readonly kind: "error";
      readonly message: string;
    };

/** Discriminant helper for exhaustive UI switches. */
export type WebsiteSearchResponseKind = WebsiteSearchResponse["kind"];
