// Zod schemas for the website-search request + response contract (server-only).
//
// These enforce the hard grounding/safety invariants at the server boundary:
//   - Citations MUST use HTTPS URLs on approved official domains (no invented pages).
//   - An `answered` response MUST carry at least one citation.
//   - Every official source record MUST be a real HTTPS official-domain page.
// The UI never trusts a response that fails these checks.

import { z } from "zod";
import type {
  OfficialSource,
  OfficialSourceCitation,
  WebsiteSearchResponse,
} from "@/types";
import { getEnv } from "./env";
import { safeParse, type ValidationResult } from "./parse";

/**
 * Domains an official citation may point to. Restricted to Lemoore College and its parent
 * West Hills Community College District properties (AGENTS.md §13 / product spec). Matched
 * against the URL host as an exact match or subdomain suffix.
 */
export const APPROVED_OFFICIAL_DOMAINS = [
  "lemoorecollege.edu",
  "westhillscollege.com",
  "whccd.edu",
] as const;

/** True when `url` is an HTTPS URL whose host is (a subdomain of) an approved domain. */
export function isApprovedOfficialUrl(url: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  if (parsed.protocol !== "https:") return false;
  const host = parsed.hostname.toLowerCase();
  return APPROVED_OFFICIAL_DOMAINS.some(
    (domain) => host === domain || host.endsWith(`.${domain}`),
  );
}

const approvedHttpsUrl = z
  .string()
  .url()
  .refine(isApprovedOfficialUrl, {
    message: "URL must be an HTTPS link on an approved official domain.",
  });

/** A single official-source page record (validates the ingested corpus JSON). */
export const officialSourceSchema: z.ZodType<OfficialSource> = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  url: approvedHttpsUrl,
  department: z.string().min(1),
  topic: z.string().min(1),
  sourceType: z.literal("official-web-page"),
  lastIngested: z.string().min(1).optional(),
  content: z.string().min(1),
  chunks: z
    .array(z.object({ id: z.string().min(1), text: z.string().min(1) }))
    .min(1),
});

/**
 * A citation attached to an answer. `url` is optional (an official source document may have
 * no approved public webpage link); when present it MUST be an approved-domain HTTPS URL, so
 * an off-domain, non-HTTPS, or internal (S3/ARN) URL can never reach the browser.
 */
export const officialSourceCitationSchema: z.ZodType<OfficialSourceCitation> =
  z.object({
    id: z.string().min(1),
    title: z.string().min(1),
    url: approvedHttpsUrl.optional(),
    excerpt: z.string().min(1),
    department: z.string().min(1).optional(),
  });

/** The website-search response union, validated before it leaves the server. */
export const websiteSearchResponseSchema: z.ZodType<WebsiteSearchResponse> =
  z.discriminatedUnion("kind", [
    z.object({
      kind: z.literal("answered"),
      query: z.string(),
      answer: z.string().min(1),
      citations: z.array(officialSourceCitationSchema).min(1),
      relatedResults: z.array(officialSourceCitationSchema),
    }),
    z.object({
      kind: z.literal("clarification"),
      query: z.string(),
      message: z.string().min(1),
      suggestedQuestions: z.array(z.string().min(1)),
    }),
    z.object({
      kind: z.literal("unsupported"),
      query: z.string(),
      message: z.string().min(1),
      relatedResults: z.array(officialSourceCitationSchema),
    }),
    z.object({
      kind: z.literal("error"),
      message: z.string().min(1),
    }),
  ]) as z.ZodType<WebsiteSearchResponse>;

const EMPTY_QUERY_MESSAGE = "Please enter a question or keywords to search.";

/** Build the search-request schema for a given maximum query length. */
export function buildSearchRequestSchema(maxInputChars: number) {
  return z.object({
    query: z
      .string({
        required_error: EMPTY_QUERY_MESSAGE,
        invalid_type_error: EMPTY_QUERY_MESSAGE,
      })
      .trim()
      .min(1, EMPTY_QUERY_MESSAGE)
      .max(
        maxInputChars,
        `Your search is too long. Please keep it under ${maxInputChars} characters.`,
      ),
  });
}

/** Search-request schema bound to the configured input limit (reuses the chat limit). */
export const searchRequestSchema = buildSearchRequestSchema(
  getEnv().chatMaxInputChars,
);

export type SearchRequestBody = z.infer<typeof searchRequestSchema>;

/** Validate a search request body; returns a structured, user-safe result. */
export function parseSearchRequest(
  input: unknown,
): ValidationResult<SearchRequestBody> {
  return safeParse(searchRequestSchema, input);
}
