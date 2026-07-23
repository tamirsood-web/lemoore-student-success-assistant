// Deterministic follow-up rewriter (server-only).
//
// Rewrites a short, context-dependent follow-up message into a fully self-contained
// question that the rest of the pipeline (retrieve → compose → escalate → normalize)
// can answer without access to prior turns.
//
// Design constraints (AGENTS.md §9/§10):
//   - Query text is treated purely as DATA. It is never executed or interpolated into
//     privileged positions — only concatenated as a plain string question.
//   - The rewriter never invents facts. It only rearranges words from the message and
//     the immediately preceding user/assistant turns.
//   - If context is missing or the message is already standalone, it is returned as-is.
//   - Prompt-injection attempts in history are inert: they never alter control flow.

import type { HistoryTurn } from "@/types";

// ---------------------------------------------------------------------------
// Follow-up detection
// ---------------------------------------------------------------------------

/**
 * Phrases that strongly indicate the message is a follow-up and cannot stand alone.
 * Checked case-insensitively against the trimmed message.
 */
const FOLLOWUP_PREFIXES = [
  "what about",
  "how about",
  "what about the",
  "how about the",
  "and the",
  "and what",
  "and how",
  "also,",
  "also the",
  "what is that",
  "what does that",
  "what does it",
  "how does that",
  "how does it",
  "is that",
  "is it",
  "can it",
  "can that",
  "does it",
  "does that",
  "tell me more",
  "more about",
  "more on",
  "what else",
  "anything else",
];

/**
 * Single-word messages that are almost certainly follow-up fragments.
 * E.g. "hours?", "location?", "phone?" after an initial department question.
 */
const FOLLOWUP_SINGLE_WORDS = new Set([
  "hours",
  "location",
  "phone",
  "email",
  "address",
  "building",
  "website",
  "contact",
  "map",
  "directions",
  "cost",
  "fees",
  "requirements",
  "deadline",
  "dates",
  "eligibility",
]);

/**
 * Pronouns / demonstratives that, when a message starts with them (after "what"/"how"),
 * indicate it references prior context.
 */
const CONTEXT_PRONOUNS = ["it", "that", "this", "they", "them", "there", "those", "these"];

/**
 * Return true when the message looks like a follow-up that needs prior context to make
 * sense. The check is intentionally conservative — when in doubt, treat as standalone
 * so we don't rewrite a legitimate short question incorrectly.
 */
export function isFollowUp(message: string): boolean {
  const lower = message.trim().toLowerCase().replace(/[?!.]+$/, "").trim();

  // Very short bare fragments (≤ 3 words) that don't form a question on their own.
  const words = lower.split(/\s+/).filter(Boolean);
  if (words.length === 0) return false;

  // Single-word known fragment → follow-up.
  if (words.length === 1 && FOLLOWUP_SINGLE_WORDS.has(words[0] ?? "")) return true;

  // Starts with a known follow-up prefix.
  if (FOLLOWUP_PREFIXES.some((prefix) => lower.startsWith(prefix))) return true;

  // Starts with a context pronoun directly (e.g. "That one?", "It is?").
  if (CONTEXT_PRONOUNS.includes(words[0] ?? "")) return true;

  // Starts with "what/how/where/when/who" immediately followed by a context pronoun.
  // e.g. "What is it?", "How does that work?", "Where is that?"
  if (
    words.length >= 2 &&
    ["what", "how", "where", "when", "who", "why"].includes(words[0] ?? "") &&
    CONTEXT_PRONOUNS.includes(words[1] ?? "")
  ) {
    return true;
  }

  return false;
}

// ---------------------------------------------------------------------------
// Topic extraction from history
// ---------------------------------------------------------------------------

/**
 * Extract the most recent subject/topic from the conversation history to anchor the
 * rewritten question. Prefers the last user message; falls back to assistant content.
 *
 * Returns a plain string suitable for appending to the new question, or null when
 * nothing useful can be extracted.
 */
function extractLastUserTopic(history: readonly HistoryTurn[]): string | null {
  // Walk history backwards, prefer user turns.
  for (let i = history.length - 1; i >= 0; i--) {
    const turn = history[i];
    if (turn && turn.role === "user" && turn.content.trim().length > 0) {
      return turn.content.trim();
    }
  }
  // Fall back to last assistant turn (for context when user hasn't asked yet).
  for (let i = history.length - 1; i >= 0; i--) {
    const turn = history[i];
    if (turn && turn.role === "assistant" && turn.content.trim().length > 0) {
      // Truncate long assistant answers to their first sentence for context.
      const firstSentence = turn.content.split(/[.!?]\s/)[0] ?? turn.content;
      return firstSentence.trim().slice(0, 120);
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Rewrite
// ---------------------------------------------------------------------------

/**
 * Rewrite a follow-up message into a standalone question using conversation history.
 *
 * Strategy:
 *   1. If the message is already standalone (not a follow-up), return it unchanged.
 *   2. If no history is available, return the message unchanged (pipeline will handle
 *      it as a bare question and likely escalate — that is the correct safe behaviour).
 *   3. Otherwise, prepend the last user question as context:
 *      "Regarding [prior question]: [new message]"
 *      This is a plain string concatenation — no model call, no invented content.
 *
 * The rewritten string is passed directly to retrieve() which treats it as data.
 */
export function rewriteIfFollowUp(
  message: string,
  history: readonly HistoryTurn[] | undefined,
): string {
  const trimmed = message.trim();

  // Already standalone — use as-is.
  if (!isFollowUp(trimmed)) return trimmed;

  // No history to draw from — return unchanged.
  if (!history || history.length === 0) return trimmed;

  const topic = extractLastUserTopic(history);
  if (!topic) return trimmed;

  // Avoid recursion: if the topic itself is a follow-up fragment, don't use it.
  if (isFollowUp(topic)) return trimmed;

  // Build the rewritten question. Strip trailing punctuation from topic for clean flow.
  const cleanTopic = topic.replace(/[?!.]+$/, "").trim();
  return `Regarding "${cleanTopic}": ${trimmed}`;
}
