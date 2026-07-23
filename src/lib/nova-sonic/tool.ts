// The Nova tool `search_lemoore_knowledge_base` + safe result mapping (server-only, testable).
//
// The dispatcher REUSES the project's existing grounded search service (S3-first + crawler
// fallback), so there is no second RAG implementation and every protection is preserved:
// citation/official-domain validation, S3-URI rejection, duplicate removal, privacy screening,
// prompt-injection handling (retrieved text is data, never instructions), safe unsupported
// responses, and safe AWS-error normalization. The tool result hands Nova ONLY the safe fields
// it needs to speak — never AWS ids, prompts, or internal errors.

import { z } from "zod";
import { isApprovedOfficialUrl } from "@/lib/validation";
import type { WebsiteSearchResponse } from "@/types";

export const KB_TOOL_NAME = "search_lemoore_knowledge_base";

export type KbToolSpec = {
  readonly toolSpec: {
    readonly name: string;
    readonly description: string;
    readonly inputSchema: { readonly json: string };
  };
};

const INPUT_JSON_SCHEMA = {
  type: "object",
  properties: {
    question: {
      type: "string",
      description: "The caller's factual question about Lemoore College, in plain language.",
    },
  },
  required: ["question"],
} as const;

/** The tool spec sent to Nova in `promptStart`. */
export function kbToolSpec(): KbToolSpec {
  return {
    toolSpec: {
      name: KB_TOOL_NAME,
      description:
        "Look up official Lemoore College information to answer factual questions about " +
        "admissions, financial aid, registration, transcripts, deadlines, programs, student " +
        "services, and contacts. Use this for ANY factual Lemoore question; never answer such " +
        "questions from general knowledge.",
      inputSchema: { json: JSON.stringify(INPUT_JSON_SCHEMA) },
    },
  };
}

const toolInputSchema = z.object({ question: z.string().min(1).max(2000) });

/** Parse Nova's tool-use input JSON safely; returns null if malformed/empty. */
export function parseToolInput(raw: string): { question: string } | null {
  try {
    const parsed = toolInputSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) return null;
    return { question: parsed.data.question.trim() };
  } catch {
    return null;
  }
}

export type ToolCitation = { readonly title: string; readonly url: string };
export type ToolResult = {
  readonly status: "answered" | "unsupported" | "error";
  readonly answer: string;
  readonly citations: readonly ToolCitation[];
  readonly escalationRecommended: boolean;
};

/**
 * Prepare the answer text Nova will SPEAK: drop inline [n] markers and bare URLs (the assistant
 * should not read long links aloud — the citation links are shown on screen instead).
 */
export function toSpokenAnswer(text: string): string {
  return text
    .replace(/\[\d+\]/g, "")
    .replace(/https?:\/\/\S+/gi, "the link shown on screen")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function normalizeUrlKey(url: string): string {
  try {
    const u = new URL(url);
    return `${u.hostname.toLowerCase()}${u.pathname.replace(/\/+$/, "")}`;
  } catch {
    return url.toLowerCase();
  }
}

/**
 * Map a WebsiteSearchResponse into the minimal, safe tool result Nova speaks from. Only
 * approved-domain HTTPS citations with a title survive; duplicates are removed. Never leaks
 * internal locators, ids, or error detail.
 */
export function toToolResult(response: WebsiteSearchResponse): ToolResult {
  if (response.kind === "answered") {
    const seen = new Set<string>();
    const citations: ToolCitation[] = [];
    for (const c of response.citations) {
      if (!c.url || !isApprovedOfficialUrl(c.url)) continue;
      const key = normalizeUrlKey(c.url);
      if (seen.has(key)) continue;
      seen.add(key);
      citations.push({ title: c.title, url: c.url });
    }
    return {
      status: "answered",
      answer: toSpokenAnswer(response.answer),
      citations,
      escalationRecommended: false,
    };
  }
  if (response.kind === "error") {
    return { status: "error", answer: response.message, citations: [], escalationRecommended: true };
  }
  // clarification | unsupported → cannot verify a specific factual answer.
  return {
    status: "unsupported",
    answer: response.message,
    citations: [],
    escalationRecommended: response.kind === "unsupported",
  };
}

/** Run the KB tool: parse input, call the injected grounded search service, map to a safe result. */
export async function runKbTool(
  rawInput: string,
  deps: { answer: (query: string) => Promise<WebsiteSearchResponse> },
): Promise<ToolResult> {
  const parsed = parseToolInput(rawInput);
  if (!parsed) {
    return {
      status: "unsupported",
      answer: "I didn't catch a clear question. Could you say that again?",
      citations: [],
      escalationRecommended: false,
    };
  }
  try {
    const response = await deps.answer(parsed.question);
    return toToolResult(response);
  } catch {
    // Never surface the raw error; the search service already normalizes AWS failures, but
    // guard here too.
    return {
      status: "error",
      answer:
        "I'm having trouble reaching the college's information service right now. Please try again shortly.",
      citations: [],
      escalationRecommended: true,
    };
  }
}
