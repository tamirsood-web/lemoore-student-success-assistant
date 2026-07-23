// Retrieval seam types.
//
// The local mock retrieval service and the future Bedrock Knowledge Base integration both
// return this normalized shape, so the route handler is agnostic to which is in use
// (design.md → Components and Interfaces). The retrieval implementation is defined later
// (tasks Group 5).

import type { CourseDate, Source } from "./source";
import type { ComparisonBlockData, LocationCardData } from "./assistant";

/** Whether a query was routed to general source matching or class-specific date lookup. */
export type RetrievalIntent = "source" | "course-date" | "location" | "comparison";

/**
 * A single retrieved snippet backed by a real local source record. `excerpt` is the only
 * text that may be used to compose an answer for this snippet, and `source` is the record
 * a resulting citation must trace back to.
 */
export type RetrievedSnippet = {
  readonly source: Source | CourseDate;
  readonly title: string;
  readonly uri?: string;
  readonly excerpt: string;
};

/**
 * Normalized retrieval output. An empty `snippets` array means no supporting evidence was
 * found and drives escalation. `needsIdentifiers` is set when a class-specific date was
 * requested without enough identifiers to make an exact match.
 * `locationCard` is populated for location-intent queries;
 * `comparisonBlock` is populated for comparison-intent queries.
 */
export type RetrievalResult = {
  readonly intent: RetrievalIntent;
  readonly snippets: readonly RetrievedSnippet[];
  readonly needsIdentifiers?: boolean;
  readonly locationCard?: LocationCardData;
  readonly comparisonBlock?: ComparisonBlockData;
};
