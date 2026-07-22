// Canonical example questions, shared by the search UI (suggestion chips) and the
// pipeline (clarification suggestions). Each maps to a real corpus topic so the suggested
// question is one the assistant can actually answer from official sources.

/** Natural-language example questions surfaced in the search overlay + empty states. */
export const EXAMPLE_QUESTIONS: readonly string[] = [
  "How do I order my official transcript?",
  "When can I register for classes?",
  "Where can I get tutoring?",
  "How do I contact financial aid?",
  "How much does attendance cost?",
  "How do I apply for graduation?",
  "Where is the academic calendar?",
  "I forgot my student portal password.",
  "What services are available for veterans?",
  "How do I meet with a counselor?",
  "What is dual enrollment?",
  "Where can I find scholarships?",
];

/** Default clarification suggestions when the query is too vague to rank anything. */
export const DEFAULT_SUGGESTIONS: readonly string[] = [
  "How do I apply to Lemoore College?",
  "How do I contact financial aid?",
  "When can I register for classes?",
  "How do I order my official transcript?",
];
