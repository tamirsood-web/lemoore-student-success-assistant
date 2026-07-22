// Normalize a Bedrock RetrieveAndGenerate response into WebsiteSearchResponse (server-only).
//
// Rules enforced here:
//   - A public citation is created ONLY from an actual retrieved reference (never from the
//     generated text alone).
//   - A public URL is shown only if it parses, is HTTPS, and its host is an approved
//     official domain (reusing the central validator). S3 URIs, ARNs, bucket names, KB ids,
//     account ids, and console URLs are never exposed.
//   - References are de-duplicated by canonical URL → source identifier → title/excerpt hash.
//   - answered requires non-empty text AND >=1 citation mapped to real evidence AND no
//     guardrail intervention; otherwise unsupported.

import type {
  OfficialSourceCitation,
  WebsiteSearchResponse,
} from "@/types";
import { isApprovedOfficialUrl } from "@/lib/validation";

// Loose shapes — Bedrock metadata is arbitrary JSON; we read defensively.
type Ref = {
  content?: { text?: string } | null;
  metadata?: Record<string, unknown> | null;
  location?: {
    webLocation?: { url?: string } | null;
    s3Location?: { uri?: string } | null;
    type?: string;
  } | null;
};
type Citation = { retrievedReferences?: Ref[] | null };
export type BedrockRagOutput = {
  output?: { text?: string } | null;
  citations?: Citation[] | null;
  guardrailAction?: string | null;
};

const MAX_EXCERPT = 500;
const UNSUPPORTED_MESSAGE =
  "I couldn't find a verified answer to that in the official Lemoore College sources. " +
  "Try rephrasing, or contact the relevant college office directly.";

function clean(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

/** First string value among `keys` in a metadata map (handles {value} wrappers). */
function metaString(
  metadata: Record<string, unknown> | null | undefined,
  keys: readonly string[],
): string | undefined {
  if (!metadata) return undefined;
  for (const key of keys) {
    const raw = metadata[key];
    const value =
      typeof raw === "string"
        ? raw
        : raw && typeof raw === "object" && "value" in raw && typeof (raw as { value: unknown }).value === "string"
          ? (raw as { value: string }).value
          : undefined;
    if (value && value.trim()) return value.trim();
  }
  return undefined;
}

const URL_KEYS = [
  "canonical_url",
  "canonicalUrl",
  "source_url",
  "sourceUrl",
  "url",
  "page_url",
  "pageUrl",
] as const;
const TITLE_KEYS = ["page_title", "pageTitle", "title", "source_title"] as const;
const DEPARTMENT_KEYS = ["department", "dept"] as const;

/** Reject obviously-internal locators before the approved-domain check. */
function isInternalLocator(value: string): boolean {
  const v = value.toLowerCase();
  return (
    v.startsWith("s3://") ||
    v.startsWith("arn:") ||
    v.includes("amazonaws.com") ||
    v.includes("console.aws")
  );
}

/** Choose a public official URL from metadata/webLocation, or undefined if none is safe. */
function pickOfficialUrl(ref: Ref): string | undefined {
  const candidates: Array<string | undefined> = [
    ...URL_KEYS.map((k) => metaString(ref.metadata, [k])),
    ref.location?.webLocation?.url ?? undefined,
  ];
  for (const candidate of candidates) {
    if (!candidate) continue;
    if (isInternalLocator(candidate)) continue;
    if (isApprovedOfficialUrl(candidate)) return candidate;
  }
  return undefined;
}

/** Stable, non-sensitive dedup key + public id source. */
function djb2(text: string): string {
  let hash = 5381;
  for (let i = 0; i < text.length; i += 1) hash = (hash * 33) ^ text.charCodeAt(i);
  return (hash >>> 0).toString(36);
}

function normalizeUrlKey(url: string): string {
  try {
    const u = new URL(url);
    return `${u.hostname.toLowerCase()}${u.pathname.replace(/\/+$/, "")}`;
  } catch {
    return url.toLowerCase();
  }
}

/** Build a citation from one retrieved reference, or null if it has no usable evidence. */
function toCitation(ref: Ref): { citation: OfficialSourceCitation; dedupKey: string } | null {
  const excerptRaw = ref.content?.text;
  if (!excerptRaw || !excerptRaw.trim()) return null;
  const excerpt = clean(excerptRaw).slice(0, MAX_EXCERPT);

  const url = pickOfficialUrl(ref);
  const title =
    metaString(ref.metadata, TITLE_KEYS) ??
    (url ? new URL(url).pathname.split("/").filter(Boolean).pop() ?? "Official Lemoore College source" : "Official source document");
  const department = metaString(ref.metadata, DEPARTMENT_KEYS);

  // Dedup key: canonical URL → internal source locator → title/excerpt hash.
  const internalLocator =
    ref.location?.webLocation?.url ?? ref.location?.s3Location?.uri ?? undefined;
  const dedupKey = url
    ? `url:${normalizeUrlKey(url)}`
    : internalLocator
      ? `loc:${internalLocator.toLowerCase()}`
      : `hash:${djb2(`${title}|${excerpt}`)}`;

  // Public id must never leak an S3 URI/ARN: derive from the official URL or a hash.
  const id = url ? `src:${normalizeUrlKey(url)}` : `doc:${djb2(dedupKey)}`;

  const citation: OfficialSourceCitation = {
    id,
    title,
    excerpt,
    ...(url ? { url } : {}),
    ...(department ? { department } : {}),
  };
  return { citation, dedupKey };
}

/** Normalize a Bedrock output into the shared response contract. */
export function normalizeBedrockResponse(
  query: string,
  output: BedrockRagOutput,
): WebsiteSearchResponse {
  const guardrailIntervened = output.guardrailAction === "INTERVENED";
  const text = output.output?.text ? clean(output.output.text) : "";

  const refs: Ref[] = (output.citations ?? []).flatMap(
    (c) => c.retrievedReferences ?? [],
  );

  // Deduplicate references by first appearance.
  const seen = new Set<string>();
  const citations: OfficialSourceCitation[] = [];
  for (const ref of refs) {
    const built = toCitation(ref);
    if (!built) continue;
    if (seen.has(built.dedupKey)) continue;
    seen.add(built.dedupKey);
    citations.push(built.citation);
  }

  const answerable =
    !guardrailIntervened && text.length > 0 && refs.length > 0 && citations.length > 0;

  if (!answerable) {
    return {
      kind: "unsupported",
      query,
      message: UNSUPPORTED_MESSAGE,
      relatedResults: citations,
    };
  }

  const [first, ...rest] = citations;
  // `first` is guaranteed by citations.length > 0 above.
  return {
    kind: "answered",
    query,
    answer: text,
    citations: [first as OfficialSourceCitation, ...rest],
    relatedResults: [],
  };
}
