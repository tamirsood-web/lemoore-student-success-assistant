// Curated source-manifest schema + validation (server/script-only).
//
// The manifest (data/ingestion/lemoore-sources.json) is the reviewed list of official URLs the
// pipeline is allowed to download. Every record is validated here so a malformed entry, an
// off-domain URL, or an unknown source type is rejected before any network or upload step.
// Reuses the app's approved-domain rule — the manifest can never widen it.

import { z } from "zod";
import { isApprovedOfficialUrl } from "../validation";

export const SOURCE_PRIORITIES = ["critical", "high", "normal", "low"] as const;
export const SOURCE_TYPES = ["official-web-page", "official-pdf", "official-document"] as const;

export type SourcePriority = (typeof SOURCE_PRIORITIES)[number];
export type SourceType = (typeof SOURCE_TYPES)[number];

const approvedUrl = z
  .string()
  .url()
  .refine(isApprovedOfficialUrl, { message: "url must be an HTTPS link on an approved official domain" });

/**
 * Optional companion payload: verified, hand-transcribed official content used INSTEAD of
 * crawling. Only for pages whose real content is JavaScript-rendered (so the crawler sees an
 * empty shell) or whose useful information is a link/PDF plus a few verified facts. The `body`
 * must contain only facts + official links verified from the official page source — never an AI
 * summary and never invented data.
 */
export const companionSchema = z.object({
  body: z.string().min(1),
  effectiveDate: z.string().min(1).optional(),
  documentVersion: z.string().min(1).optional(),
  currentStatus: z.enum(["current", "historical", "review-needed"]).optional(),
});

export type CompanionSource = z.infer<typeof companionSchema>;

/** One reviewed source entry. */
export const sourceRecordSchema = z.object({
  url: approvedUrl,
  topic: z.string().min(1),
  department: z.string().min(1),
  priority: z.enum(SOURCE_PRIORITIES),
  sourceType: z.enum(SOURCE_TYPES),
  expectedTitle: z.string().min(1),
  enabled: z.boolean(),
  /** Optional synonym/alias terms embedded into metadata to widen retrieval wording. */
  keywords: z.array(z.string().min(1)).optional(),
  /** Optional verified inline content used instead of crawling (JS-rendered / link-only pages). */
  companion: companionSchema.optional(),
  /** Optional human note explaining inclusion / caveats. */
  notes: z.string().optional(),
});

export type SourceRecord = z.infer<typeof sourceRecordSchema>;

/** The manifest file: metadata + the reviewed source list. A bare array is also accepted. */
export const sourceManifestSchema = z
  .union([
    z.array(sourceRecordSchema),
    z.object({
      name: z.string().optional(),
      description: z.string().optional(),
      version: z.union([z.string(), z.number()]).optional(),
      updated: z.string().optional(),
      sources: z.array(sourceRecordSchema),
    }),
  ])
  .transform((value) => (Array.isArray(value) ? { sources: value } : value));

export type SourceManifest = z.infer<typeof sourceManifestSchema>;

export type ManifestValidation =
  | { readonly ok: true; readonly manifest: SourceManifest; readonly records: SourceRecord[] }
  | { readonly ok: false; readonly issues: string[] };

/** Validate parsed JSON as a source manifest, returning records or readable issues. */
export function validateManifest(input: unknown): ManifestValidation {
  const parsed = sourceManifestSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      issues: parsed.error.issues.map((i) => `${i.path.join(".") || "<root>"}: ${i.message}`),
    };
  }
  const records = parsed.data.sources;

  // Reject duplicate URLs (after case-normalizing the host) so the same page isn't listed twice.
  const seen = new Map<string, number>();
  const issues: string[] = [];
  records.forEach((r, idx) => {
    const key = r.url.toLowerCase();
    if (seen.has(key)) {
      issues.push(`sources[${idx}]: duplicate url ${r.url} (also at index ${seen.get(key)})`);
    } else {
      seen.set(key, idx);
    }
  });
  if (issues.length > 0) return { ok: false, issues };

  return { ok: true, manifest: parsed.data, records };
}

/** The subset of records the build step will actually download. */
export function enabledRecords(records: readonly SourceRecord[]): SourceRecord[] {
  return records.filter((r) => r.enabled);
}
