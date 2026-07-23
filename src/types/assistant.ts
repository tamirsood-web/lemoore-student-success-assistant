// The assistant response contract and its directly related types.
//
// This is the permanent wire contract between the server and the UI. It conforms to the
// preferred schema in AGENTS.md §9 (answer, confidence, citations, department?,
// escalationRecommended, suggestedQuestions), and additionally models explicit response
// *states* (requirements.md response-contract rules) so the UI switches on a discriminant
// instead of interpreting free-form answer text.

import type { DepartmentContact, EscalationGuidance } from "./escalation";
import type { SensitiveCategory } from "./guardrail";

/** A read-only array guaranteed to hold at least one element. */
export type NonEmptyReadonlyArray<T> = readonly [T, ...T[]];

/**
 * Student-facing confidence, expressed as an explicit union rather than a numeric
 * probability (AGENTS.md §9). The UI maps this to confidence-safe language and never
 * shows the raw value.
 */
export type Confidence = "high" | "medium" | "low";

/** Stable identifier of an approved `Source`. */
export type SourceId = string;

/**
 * A citation shown to the student. `sourceId` is required so every displayed citation
 * references a real source record (requirements.md Req 3.2 / Correctness Property 2); the
 * remaining fields match the AGENTS.md §9 citation shape.
 */
export type Citation = {
  readonly sourceId: SourceId;
  readonly title: string;
  readonly uri?: string;
  readonly excerpt?: string;
};

/**
 * Privacy-safe rejection detail attached to a `safe_rejection` response. Describes the
 * category of sensitive input and where to go instead; never repeats the detected value
 * (AGENTS.md §11, requirements.md Req 6).
 */
export type SafeRejection = {
  readonly category: SensitiveCategory;
  readonly message: string;
  readonly department: string;
  readonly contact?: DepartmentContact;
};

/** Explicit response states the UI can branch on without parsing answer text. */
export type ResponseKind = "grounded" | "insufficient_evidence" | "safe_rejection";

/**
 * The exact AGENTS.md §9 field set, used below to prove — at compile time — that every
 * response variant conforms to the documented contract. Arrays are `readonly` here: this
 * is a compile-time strengthening only; the serialized JSON shape is identical.
 */
export type Section9Response = {
  readonly answer: string;
  readonly confidence: Confidence;
  readonly citations: readonly Citation[];
  readonly department?: string;
  readonly escalationRecommended: boolean;
  readonly suggestedQuestions: readonly string[];
};

// ---------------------------------------------------------------------------
// Location card — carried by a grounded response when the query asks where to go.
// ---------------------------------------------------------------------------

/**
 * Structured location/contact data for a single department, shown as a dedicated UI card.
 * All field values are demo data; never claim official accuracy.
 */
export type LocationCardData = {
  readonly name: string;
  readonly building?: string;
  readonly hours?: string;
  readonly phone?: string;
  readonly email?: string;
  readonly url?: string;
  readonly mapUrl?: string;
};

// ---------------------------------------------------------------------------
// Comparison block — carried by a grounded response when the query compares two concepts.
// ---------------------------------------------------------------------------

/** One side of a comparison (option A or option B). */
export type ComparisonOption = {
  readonly label: string;
  readonly explanation: string;
};

/**
 * Structured comparison data for two related college concepts, shown as a side-by-side
 * (stacked on mobile) UI block. Grounded only from approved mock sources.
 */
export type ComparisonBlockData = {
  readonly topic: string;
  readonly optionA: ComparisonOption;
  readonly optionB: ComparisonOption;
  readonly keyDifferences: readonly string[];
};

// ---------------------------------------------------------------------------
// Response variants
// ---------------------------------------------------------------------------

/** A grounded answer composed only from retrieved sources, with one or more citations. */
export type GroundedResponse = {
  readonly kind: "grounded";
  readonly answer: string;
  readonly confidence: Confidence;
  readonly citations: NonEmptyReadonlyArray<Citation>;
  readonly department?: string;
  readonly escalationRecommended: boolean;
  readonly suggestedQuestions: readonly string[];
  /** Present when the query asked where an office is. */
  readonly locationCard?: LocationCardData;
  /** Present when the query asked to compare two concepts. */
  readonly comparisonBlock?: ComparisonBlockData;
};

/**
 * A response for a question the assistant cannot verify from approved sources. It states
 * the uncertainty honestly, always recommends escalation, and carries official-contact
 * guidance (AGENTS.md §10, requirements.md Req 5).
 */
export type InsufficientEvidenceResponse = {
  readonly kind: "insufficient_evidence";
  readonly answer: string;
  readonly confidence: "low";
  readonly citations: readonly Citation[];
  readonly department?: string;
  readonly escalationRecommended: true;
  readonly escalation: EscalationGuidance;
  readonly suggestedQuestions: readonly string[];
};

/**
 * A response to input containing sensitive identifiers. It is refused with a privacy-safe
 * message and a pointer to an official secure channel (AGENTS.md §11, requirements.md
 * Req 6). Carries no citations.
 */
export type SafeRejectionResponse = {
  readonly kind: "safe_rejection";
  readonly answer: string;
  readonly confidence: "low";
  readonly citations: readonly Citation[];
  readonly department?: string;
  readonly escalationRecommended: boolean;
  readonly rejection: SafeRejection;
  readonly suggestedQuestions: readonly string[];
};

/**
 * The response returned by `POST /api/chat`. An explicit discriminated union over
 * `kind` — grounded, insufficient-evidence, or safe-rejection — every member of which
 * satisfies the AGENTS.md §9 contract (see the assertion below).
 */
export type AssistantResponse =
  | GroundedResponse
  | InsufficientEvidenceResponse
  | SafeRejectionResponse;

// --- Compile-time conformance guard (no runtime footprint) -------------------------
// If any variant ever stops satisfying the §9 field set, `_Section9Conformance` fails to
// resolve and typecheck breaks — keeping the union honest to the documented contract.
type Assert<T extends true> = T;
type _Section9Conformance = Assert<
  AssistantResponse extends Section9Response ? true : false
>;
