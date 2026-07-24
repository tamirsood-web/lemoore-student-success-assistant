// AnswerFormatter — MANDATORY output contract enforcement (server-only).
//
// REQUIRED OUTPUT FORMAT (non-negotiable):
//
//   Short answer (1–2 sentences max).
//
//   (blank line)
//
//   Remaining information as a list:
//   • bullets   — for details, requirements, contacts, dates, locations
//   1. 2. 3.   — for sequential processes/steps
//
//   (blank line)
//
//   Contact details (if any) as their own bullet section.
//
// RULES:
//   - Maximum paragraph length: 2 sentences. After 2 sentences → blank line.
//   - Steps, requirements, documents, contacts, dates, locations, instructions
//     MUST be rendered as a list. NEVER inside a paragraph.
//   - Never return a single wall of text.
//   - Facts remain unchanged. Formatting changes freely for readability.
//
// Every sentence in the output comes directly from the source corpus.
// This module only adds structural elements (numbers, bullets, newlines).

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** The detected answer format to apply. */
export type AnswerFormat =
  | "process"
  | "contact"
  | "requirements"
  | "costs"
  | "dates"
  | "general";

/** Input to the formatter: classified sentences from the source corpus. */
export type FormatterInput = {
  /** The user's original question (used for format detection). */
  readonly query: string;
  /** Informational/body sentences (already filtered of marketing fluff). */
  readonly body: readonly string[];
  /** Contact/location sentences (phone, hours, email, address). */
  readonly contact: readonly string[];
};

// ---------------------------------------------------------------------------
// Format detection
// ---------------------------------------------------------------------------

/** Detect the best format based on the user's question. */
export function detectFormat(query: string): AnswerFormat {
  const q = query.toLowerCase().trim();

  // Process/Steps
  if (
    /\b(how do i|how can i|how to|steps to|what is the process|what are the steps)\b/.test(q) &&
    /\b(apply|register|enroll|order|request|get|submit|set up|sign up|complete|start|create)\b/.test(q)
  ) {
    return "process";
  }

  // Contact/Location
  if (
    /\b(where is|where are|where can i find|where can i get|how do i contact|how can i contact|how can i reach|how do i reach|phone number|office hours|located|location of)\b/.test(q)
  ) {
    return "contact";
  }

  // Requirements/Eligibility
  if (
    /\b(what documents|what forms|requirements|required|eligible|eligibility|who can|who is|do i need|what do i need)\b/.test(q)
  ) {
    return "requirements";
  }

  // Costs/Fees
  if (/\b(how much|cost|fee|tuition|price|pay|payment|charge)\b/.test(q)) {
    return "costs";
  }

  // Dates/Deadlines
  if (
    /\b(when is|when are|when do|when does|deadline|due date|important date|calendar|semester start)\b/.test(q)
  ) {
    return "dates";
  }

  return "general";
}

// ---------------------------------------------------------------------------
// Formatting utilities
// ---------------------------------------------------------------------------

/** Format sentences as a numbered list. */
function toNumberedList(sentences: readonly string[]): string {
  return sentences.map((s, i) => `${i + 1}. ${s}`).join("\n");
}

/** Format sentences as a bullet list. */
function toBulletList(sentences: readonly string[]): string {
  return sentences.map((s) => `• ${s}`).join("\n");
}

/**
 * Format contact sentences as a standalone block without bullets.
 * Parses contact details into labeled fields where possible.
 */
function toContactBlock(sentences: readonly string[]): string {
  // Render each contact sentence as its own plain line.
  // These will be rendered as separate <p> elements by the StructuredAnswer component,
  // visually distinct from the bulleted service/feature list above.
  return sentences.join("\n\n");
}

// ---------------------------------------------------------------------------
// The ONE formatting function — enforces the output contract.
// ---------------------------------------------------------------------------

/**
 * Format an answer according to the MANDATORY output contract.
 *
 * Structure:
 *   1. Direct answer: first 1–2 sentences as a short paragraph.
 *   2. Remaining body: rendered as a list (numbered for process, bullets otherwise).
 *   3. Contact: always a separate bullet section.
 *
 * This function does NOT try to be clever about what is a "step" vs "detail".
 * If there are more than 2 body sentences, the excess is ALWAYS a list.
 */
export function formatAnswer(input: FormatterInput): string {
  const { query, body, contact } = input;

  if (body.length === 0 && contact.length === 0) {
    return "";
  }

  const format = detectFormat(query);
  const useNumbered = format === "process";

  const parts: string[] = [];

  // --- Direct answer: first 1–2 sentences ---
  const introCount = Math.min(2, body.length);
  const intro = body.slice(0, introCount);
  const rest = body.slice(introCount);

  if (intro.length > 0) {
    parts.push(intro.join(" "));
  }

  // --- Remaining body: ALWAYS as a list when there are items ---
  if (rest.length > 0) {
    if (useNumbered) {
      parts.push(toNumberedList(rest));
    } else {
      parts.push(toBulletList(rest));
    }
  }

  // --- Contact: ALWAYS a separate standalone section (no bullets) ---
  if (contact.length > 0) {
    parts.push(toContactBlock(contact));
  }

  return parts.join("\n\n");
}
