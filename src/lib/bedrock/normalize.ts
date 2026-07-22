// Normalization to AssistantResponse (server-only, deterministic).
//
// Assembles the typed response from the guardrail verdict, retrieval result, composed
// answer, and escalation decision. It enforces citation integrity: every emitted citation
// must resolve to a real mock source, or it is dropped (Correctness Property 2). Decision
// order: sensitive rejection → insufficient evidence → grounded.

import type {
  Citation,
  DepartmentContact,
  EscalationReason,
  InsufficientEvidenceResponse,
  NonEmptyReadonlyArray,
  RetrievedSnippet,
  ToAssistantResponseFn,
} from "@/types";
import {
  sources,
  getSourceById,
  departments,
  DEPARTMENT_IDS,
} from "@/lib/mock";
import { escalationMessage } from "./escalation";

const titleToSourceId = new Map(sources.map((source) => [source.title, source.id]));

const contactByName = new Map<string, DepartmentContact>();
for (const id of DEPARTMENT_IDS) {
  const contact = departments[id];
  contactByName.set(contact.name, contact);
}

function resolveContact(departmentName: string): DepartmentContact {
  return contactByName.get(departmentName) ?? { name: departmentName };
}

/** Convert a snippet to a citation, or null if it does not map to a real source. */
function toCitation(snippet: RetrievedSnippet): Citation | null {
  const source = snippet.source;
  const sourceId =
    "id" in source ? source.id : titleToSourceId.get(snippet.title);
  if (!sourceId || !getSourceById(sourceId)) return null;
  return {
    sourceId,
    title: snippet.title,
    ...(snippet.uri ? { uri: snippet.uri } : {}),
    excerpt: snippet.excerpt,
  };
}

function buildCitations(snippets: readonly RetrievedSnippet[]): Citation[] {
  return snippets
    .map(toCitation)
    .filter((citation): citation is Citation => citation !== null);
}

function buildInsufficient(
  reason: EscalationReason,
  departmentName: string,
  citations: readonly Citation[],
  suggestedQuestions: readonly string[],
): InsufficientEvidenceResponse {
  const contact = resolveContact(departmentName);
  const message = escalationMessage(departmentName, reason);
  return {
    kind: "insufficient_evidence",
    answer: message,
    confidence: "low",
    citations,
    department: departmentName,
    escalationRecommended: true,
    escalation: { reason, department: departmentName, contact, message },
    suggestedQuestions,
  };
}

/** Assemble a typed AssistantResponse from the server-flow pieces. */
export const toAssistantResponse: ToAssistantResponseFn = (input) => {
  const { guardrail, result, composedAnswer, escalation } = input;
  const suggestedQuestions = input.suggestedQuestions ?? [];

  // 1. Sensitive-data rejection takes precedence; never echoes the detected value.
  if (!guardrail.ok) {
    const contact = resolveContact(guardrail.department);
    return {
      kind: "safe_rejection",
      answer: guardrail.safeMessage,
      confidence: "low",
      citations: [],
      department: guardrail.department,
      escalationRecommended: false,
      rejection: {
        category: guardrail.category,
        message: guardrail.safeMessage,
        department: guardrail.department,
        contact,
      },
      suggestedQuestions,
    };
  }

  const citations = buildCitations(result.snippets);
  const departmentName = escalation.department ?? departments.student_services.name;
  const reason: EscalationReason = escalation.reason ?? "no_relevant_source";

  // 2. Insufficient evidence: escalation requested, no valid citations, or no answer.
  if (
    escalation.escalationRecommended ||
    citations.length === 0 ||
    composedAnswer === null
  ) {
    return buildInsufficient(reason, departmentName, citations, suggestedQuestions);
  }

  // 3. Grounded answer (guaranteed at least one citation).
  const [firstCitation, ...restCitations] = citations;
  if (!firstCitation) {
    return buildInsufficient(reason, departmentName, citations, suggestedQuestions);
  }
  const nonEmptyCitations: NonEmptyReadonlyArray<Citation> = [
    firstCitation,
    ...restCitations,
  ];
  return {
    kind: "grounded",
    answer: composedAnswer,
    confidence: escalation.confidence,
    citations: nonEmptyCitations,
    escalationRecommended: false,
    suggestedQuestions,
  };
};
