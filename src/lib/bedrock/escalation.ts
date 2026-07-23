// Deterministic escalation rules (AGENTS.md §10).
// Applied server-side, independent of any model output.

import type { EscalationDecision, RetrievalResult } from "@/types";
import { getDepartment } from "@/lib/mock";

type EscalationInput = {
  readonly result: RetrievalResult;
  readonly composedAnswer: string | null;
};

export function applyEscalationRules(input: EscalationInput): EscalationDecision {
  const { result } = input;

  if (result.intent === "course-date" && result.needsIdentifiers) {
    return {
      escalationRecommended: true,
      department: getDepartment("admissions_records").name,
      confidence: "low",
      reason: "unresolved_course_date",
    };
  }

  if (result.snippets.length === 0) {
    return {
      escalationRecommended: true,
      department: getDepartment("student_services").name,
      confidence: "low",
      reason: "no_relevant_source",
    };
  }

  if (!input.composedAnswer) {
    return {
      escalationRecommended: true,
      department: getDepartment("student_services").name,
      confidence: "low",
      reason: "missing_citations",
    };
  }

  const confidence = result.snippets.length >= 2 ? "high" : "medium";
  const firstSnippet = result.snippets[0];
  const source = firstSnippet?.source;
  const dept =
    source && "department" in source
      ? getDepartment(
          source.department as Parameters<typeof getDepartment>[0],
        ).name
      : undefined;

  return { escalationRecommended: false, department: dept, confidence };
}
