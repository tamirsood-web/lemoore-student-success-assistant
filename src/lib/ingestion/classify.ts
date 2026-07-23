// Per-page approval + current-status classification (pure; server/script-only).
//
// Decides whether an extracted page is approved for upload and what `current_status` its
// metadata should carry. Enforces two hard rules: a stale/historical or archived page is NEVER
// marked "current" and is NOT auto-approved (task: "Do not assume archived pages are current";
// "no stale document is silently marked current"), and empty/minimal/duplicate pages are
// excluded with an explicit reason.

import type { CurrentStatus } from "./metadata";
import type { HistoricalSignal } from "./historical";

/** Minimum unique words for a page to be considered meaningful content. */
export const MIN_CONTENT_WORDS = 40;

export type ExclusionReason =
  | "http-error"
  | "extraction-failed"
  | "empty-or-minimal-content"
  | "duplicate"
  | "historical-or-stale"
  | "canonical-off-domain";

export type PageAssessmentInput = {
  readonly httpOk: boolean;
  readonly title: string;
  readonly wordCount: number;
  readonly historical: HistoricalSignal;
  readonly duplicate: { readonly isDuplicate: boolean; readonly duplicateOf?: string } | undefined;
  /** True when a canonical URL was found AND it is off an approved domain. */
  readonly canonicalOffDomain: boolean;
  /** When true, an explicitly historical entry is allowed through (marked historical). */
  readonly allowHistorical?: boolean;
};

export type PageAssessment = {
  readonly approved: boolean;
  readonly currentStatus: CurrentStatus;
  readonly exclusionReason?: ExclusionReason;
};

/** Resolve `current_status`: historical/archived signals can never yield "current". */
export function resolveCurrentStatus(historical: HistoricalSignal): CurrentStatus {
  if (historical.historical) return "historical";
  return "current";
}

/** Assess a single page for approval + status. Order of checks defines the recorded reason. */
export function assessPage(input: PageAssessmentInput): PageAssessment {
  const currentStatus = resolveCurrentStatus(input.historical);

  if (!input.httpOk) {
    return { approved: false, currentStatus, exclusionReason: "http-error" };
  }
  if (!input.title.trim()) {
    return { approved: false, currentStatus, exclusionReason: "extraction-failed" };
  }
  if (input.wordCount < MIN_CONTENT_WORDS) {
    return { approved: false, currentStatus, exclusionReason: "empty-or-minimal-content" };
  }
  if (input.canonicalOffDomain) {
    return { approved: false, currentStatus, exclusionReason: "canonical-off-domain" };
  }
  if (input.duplicate?.isDuplicate) {
    return { approved: false, currentStatus, exclusionReason: "duplicate" };
  }
  if (input.historical.historical && !input.allowHistorical) {
    return { approved: false, currentStatus: "historical", exclusionReason: "historical-or-stale" };
  }

  return { approved: true, currentStatus };
}
