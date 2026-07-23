// Response normalizer — maps retrieval + escalation + guardrail state to the
// AssistantResponse wire contract (AGENTS.md §9).

import type {
  AssistantResponse,
  Citation,
  GroundedResponse,
  InsufficientEvidenceResponse,
  SafeRejectionResponse,
  NormalizeInput,
  EscalationReason,
} from "@/types";
import { getDepartment } from "@/lib/mock";
import { sources, sourceById } from "@/lib/mock";
import { COURSE_DATE_SOURCE_TITLE } from "@/lib/mock";

function resolveSourceId(title: string): string {
  for (const source of sources) {
    if (source.title === title) return source.id;
  }
  if (title === COURSE_DATE_SOURCE_TITLE) return "src_course_dates_dataset";
  return "unknown";
}

function buildCitations(result: NormalizeInput["result"]): Citation[] {
  return result.snippets.map((snippet) => {
    const sourceId = resolveSourceId(snippet.title);
    const resolved = sourceById.get(sourceId);
    return {
      sourceId,
      title: snippet.title,
      uri: snippet.uri ?? resolved?.uri,
      excerpt: snippet.excerpt,
    };
  });
}

function escalationMessage(
  department: string,
  reason: EscalationReason | undefined,
): string {
  if (reason === "unresolved_course_date") {
    return (
      `I could not verify the specific census or drop date for that course from the approved sources. ` +
      `Please provide your term, subject, catalog number, and section number, ` +
      `or contact ${department} for confirmation.`
    );
  }
  if (reason === "no_relevant_source") {
    return `I could not verify that from the approved college sources. Please contact ${department} for confirmation.`;
  }
  return `I could not verify a complete answer from the approved college sources. Please contact ${department} for confirmation.`;
}

type DeptKey = Parameters<typeof getDepartment>[0];
const DEPT_NAME_MAP: Record<string, DeptKey> = {
  "Admissions & Records": "admissions_records",
  "Financial Aid": "financial_aid",
  Counseling: "counseling",
  "Adult Learner Services": "adult_learner_services",
  "Student Services": "student_services",
};
function resolveDeptKey(name: string): DeptKey {
  return DEPT_NAME_MAP[name] ?? "student_services";
}

export function toAssistantResponse(input: NormalizeInput): AssistantResponse {
  const {
    guardrail,
    result,
    composedAnswer,
    escalation,
    suggestedQuestions = [],
  } = input;

  // safe_rejection
  if (!guardrail.ok) {
    const response: SafeRejectionResponse = {
      kind: "safe_rejection",
      answer: guardrail.safeMessage,
      confidence: "low",
      citations: [],
      department: guardrail.department,
      escalationRecommended: true,
      rejection: {
        category: "student_id",
        message: guardrail.safeMessage,
        department: guardrail.department,
        contact: getDepartment("student_services"),
      },
      suggestedQuestions: [],
    };
    return response;
  }

  const citations = buildCitations(result);

  // insufficient_evidence
  if (escalation.escalationRecommended) {
    const deptName =
      escalation.department ?? getDepartment("student_services").name;
    const contact = getDepartment(resolveDeptKey(deptName));
    const response: InsufficientEvidenceResponse = {
      kind: "insufficient_evidence",
      answer: escalationMessage(deptName, escalation.reason),
      confidence: "low",
      citations,
      department: deptName,
      escalationRecommended: true,
      escalation: {
        reason: escalation.reason ?? "no_relevant_source",
        department: deptName,
        contact,
        message: escalationMessage(deptName, escalation.reason),
      },
      suggestedQuestions: suggestedQuestions as string[],
    };
    return response;
  }

  // grounded
  const nonEmptyCitations: [Citation, ...Citation[]] =
    citations.length > 0
      ? (citations as [Citation, ...Citation[]])
      : [{ sourceId: "unknown", title: "Approved College Sources" }];

  const response: GroundedResponse = {
    kind: "grounded",
    answer: composedAnswer ?? "",
    confidence: escalation.confidence,
    citations: nonEmptyCitations,
    department: escalation.department,
    escalationRecommended: false,
    suggestedQuestions: suggestedQuestions as string[],
  };
  return response;
}
