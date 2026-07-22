// Deterministic escalation rules (server-only).
//
// Escalation is decided by application rules independent of any model phrasing
// (AGENTS.md §10). Given the same input, the same decision is always produced. Query text
// is scanned as data only — injected "instructions" never change control flow (Req 7).
//
// Reasons covered: query-driven (safety, private/student-specific, conflicting-sources,
// binding-policy, high-stakes) and result-driven (unresolved course date, no relevant
// source, missing citations).

import type {
  ApplyEscalationRulesFn,
  Confidence,
  EscalationDecision,
  EscalationReason,
  RetrievalResult,
} from "@/types";
import { departments, type DepartmentId } from "@/lib/mock";

/** Responsible department per escalation reason (deterministic mapping). */
const REASON_DEPARTMENT: Record<EscalationReason, DepartmentId> = {
  no_relevant_source: "student_services",
  missing_citations: "student_services",
  private_or_student_specific: "admissions_records",
  binding_policy_interpretation: "counseling",
  conflicting_sources: "admissions_records",
  unresolved_course_date: "admissions_records",
  safety_or_emergency: "student_services",
  high_stakes_insufficient_evidence: "financial_aid",
};

const SAFETY_PHRASES = [
  "emergency",
  "suicide",
  "kill myself",
  "hurt myself",
  "harm myself",
  "self harm",
  "self-harm",
  "threat",
  "weapon",
  "overdose",
  "medical crisis",
  "in danger",
];

const PRIVATE_PHRASES = [
  "my grades",
  "my gpa",
  "my financial aid status",
  "my enrollment status",
  "my schedule",
  "my academic record",
  "my transcript status",
  "another student",
  "other student",
  "will i graduate",
  "am i going to graduate",
  "which classes should i take",
  "based on my academic record",
  "based on my private",
  "change my enrollment",
  "why was i denied",
];

const CONFLICT_PHRASES = [
  "different deadline",
  "different deadlines",
  "conflict",
  "contradict",
  "which one is correct",
  "two documents",
  "disagree",
];

const HIGH_STAKES_UNCERTAINTY = [
  "approv",
  "guarantee",
  "definitely",
  "eligible",
  "denied",
  "will i get",
  "am i going to",
];

const HIGH_STAKES_DOMAIN = [
  "financial aid",
  "enrollment",
  "immigration",
  "legal",
  "graduat",
  "academic standing",
];

const BINDING_PHRASES = [
  "interpret the policy",
  "official ruling",
  "is it allowed",
  "am i allowed",
  "binding",
  "can you change",
];

function includesAny(haystack: string, phrases: readonly string[]): boolean {
  return phrases.some((phrase) => haystack.includes(phrase));
}

/** Detect a query-driven escalation reason, in fixed priority order. */
function detectQueryReason(query: string): EscalationReason | null {
  const q = query.toLowerCase();
  if (includesAny(q, SAFETY_PHRASES)) return "safety_or_emergency";
  if (includesAny(q, PRIVATE_PHRASES)) return "private_or_student_specific";
  if (includesAny(q, CONFLICT_PHRASES)) return "conflicting_sources";
  if (includesAny(q, HIGH_STAKES_UNCERTAINTY) && includesAny(q, HIGH_STAKES_DOMAIN)) {
    return "high_stakes_insufficient_evidence";
  }
  if (includesAny(q, BINDING_PHRASES)) return "binding_policy_interpretation";
  return null;
}

function computeConfidence(result: RetrievalResult): Confidence {
  const count = result.snippets.length;
  if (result.intent === "course-date" && count === 1) return "high";
  if (count >= 2) return "high";
  if (count === 1) return "medium";
  return "low";
}

function escalate(reason: EscalationReason): EscalationDecision {
  const departmentName = departments[REASON_DEPARTMENT[reason]].name;
  return {
    escalationRecommended: true,
    department: departmentName,
    confidence: "low",
    reason,
  };
}

/** Apply deterministic escalation rules to a retrieval result and (optional) query. */
export const applyEscalationRules: ApplyEscalationRulesFn = ({
  result,
  composedAnswer,
  query,
}) => {
  // 1. Query-driven reasons (data-only keyword rules).
  if (query) {
    const queryReason = detectQueryReason(query);
    if (queryReason) return escalate(queryReason);
  }

  // 2. Result-driven reasons.
  if (result.intent === "course-date") {
    if (result.needsIdentifiers || result.snippets.length === 0) {
      return escalate("unresolved_course_date");
    }
  }
  if (result.snippets.length === 0) {
    return escalate("no_relevant_source");
  }
  if (composedAnswer === null || composedAnswer.trim() === "") {
    return escalate("missing_citations");
  }

  // 3. No escalation.
  return {
    escalationRecommended: false,
    confidence: computeConfidence(result),
  };
};

/** Transparent fallback wording (AGENTS.md §10); never claims a human was contacted. */
export function escalationMessage(
  departmentName: string,
  reason?: EscalationReason,
): string {
  if (reason === "safety_or_emergency") {
    return `If this is an urgent safety concern or emergency, please contact emergency services or campus safety directly. For other help, you can contact ${departmentName}.`;
  }
  return `I could not verify that from the approved college sources. Please contact ${departmentName} for confirmation.`;
}
