// Bedrock S3 metadata sidecar construction + validation (server/script-only).
//
// Produces the `<file>.metadata.json` companion Amazon Bedrock Knowledge Bases reads for each
// S3 object: typed `metadataAttributes` with per-field `includeForEmbedding`. Retrieval-facing
// fields (title/department/topic) are embedded; provenance fields (URLs, timestamps, version)
// are metadata-only so they filter/annotate without polluting the vector. It NEVER emits
// bucket names, credentials, student data, or fabricated/speculative values.

import { z } from "zod";
import { isApprovedOfficialUrl } from "../validation";

/** Fields that participate in embeddings (task: page_title, department, topic). */
export const EMBEDDED_METADATA_KEYS = ["page_title", "department", "topic"] as const;

export type CurrentStatus = "current" | "historical" | "review-needed";

export type MetadataInput = {
  readonly sourceUrl: string;
  readonly pageTitle: string;
  readonly department: string;
  readonly topic: string;
  readonly sourceType: string;
  readonly canonicalUrl: string;
  readonly lastChecked: string;
  readonly currentStatus: CurrentStatus;
  /** Only when independently verified from the page/headers — never guessed. */
  readonly effectiveDate?: string;
  /** Only when a real version/edition is present on the source — never guessed. */
  readonly documentVersion?: string;
  /** Optional synonym/alias terms (embedded) to widen retrieval for related wording. */
  readonly keywords?: readonly string[];
};

type StringAttribute = {
  value: { type: "STRING"; stringValue: string };
  includeForEmbedding: boolean;
};

type StringListAttribute = {
  value: { type: "STRING_LIST"; stringListValue: string[] };
  includeForEmbedding: boolean;
};

export type MetadataAttributes = {
  page_title: StringAttribute;
  department: StringAttribute;
  topic: StringAttribute;
  source_url: StringAttribute;
  canonical_url: StringAttribute;
  source_type: StringAttribute;
  last_checked: StringAttribute;
  current_status: StringAttribute;
  effective_date?: StringAttribute;
  document_version?: StringAttribute;
  /** Optional synonym/alias terms to widen retrieval; embedded, never a citation field. */
  keywords?: StringListAttribute;
};

export type MetadataSidecar = {
  metadataAttributes: MetadataAttributes;
};

function stringAttr(value: string, includeForEmbedding: boolean): StringAttribute {
  return { value: { type: "STRING", stringValue: value }, includeForEmbedding };
}

function stringListAttr(values: string[], includeForEmbedding: boolean): StringListAttribute {
  return { value: { type: "STRING_LIST", stringListValue: values }, includeForEmbedding };
}

/**
 * Build the metadata sidecar object. Throws if `sourceUrl`/`canonicalUrl` are not approved
 * HTTPS official-domain URLs, so an off-domain or internal URI can never be written as
 * citation metadata.
 */
export function buildMetadataSidecar(input: MetadataInput): MetadataSidecar {
  if (!isApprovedOfficialUrl(input.sourceUrl)) {
    throw new Error(`Refusing metadata: source_url is not an approved official HTTPS URL (${input.sourceUrl}).`);
  }
  if (!isApprovedOfficialUrl(input.canonicalUrl)) {
    throw new Error(`Refusing metadata: canonical_url is not an approved official HTTPS URL (${input.canonicalUrl}).`);
  }

  const attrs: MetadataAttributes = {
    // Embedded (retrieval-facing).
    page_title: stringAttr(input.pageTitle, true),
    department: stringAttr(input.department, true),
    topic: stringAttr(input.topic, true),
    // Metadata-only (provenance / filtering).
    source_url: stringAttr(input.sourceUrl, false),
    canonical_url: stringAttr(input.canonicalUrl, false),
    source_type: stringAttr(input.sourceType, false),
    last_checked: stringAttr(input.lastChecked, false),
    current_status: stringAttr(input.currentStatus, false),
  };

  if (input.effectiveDate) attrs.effective_date = stringAttr(input.effectiveDate, false);
  if (input.documentVersion) attrs.document_version = stringAttr(input.documentVersion, false);
  if (input.keywords && input.keywords.length > 0) {
    attrs.keywords = stringListAttr([...input.keywords], true);
  }

  return { metadataAttributes: attrs };
}

/** Zod schema validating a metadata sidecar's structure + invariants. */
const stringAttributeSchema = z.object({
  value: z.object({
    type: z.literal("STRING"),
    stringValue: z.string().min(1),
  }),
  includeForEmbedding: z.boolean(),
});

const stringListAttributeSchema = z.object({
  value: z.object({
    type: z.literal("STRING_LIST"),
    stringListValue: z.array(z.string().min(1)).min(1),
  }),
  includeForEmbedding: z.boolean(),
});

export const metadataSidecarSchema = z
  .object({
    metadataAttributes: z
      .object({
        page_title: stringAttributeSchema,
        department: stringAttributeSchema,
        topic: stringAttributeSchema,
        source_url: stringAttributeSchema,
        canonical_url: stringAttributeSchema,
        source_type: stringAttributeSchema,
        last_checked: stringAttributeSchema,
        current_status: stringAttributeSchema,
        effective_date: stringAttributeSchema.optional(),
        document_version: stringAttributeSchema.optional(),
        keywords: stringListAttributeSchema.optional(),
      })
      .strict(),
  })
  .superRefine((data, ctx) => {
    const a = data.metadataAttributes;
    // Embedding flags must match the contract exactly.
    const mustEmbed: Array<[string, StringAttribute]> = [
      ["page_title", a.page_title],
      ["department", a.department],
      ["topic", a.topic],
    ];
    for (const [key, attr] of mustEmbed) {
      if (!attr.includeForEmbedding) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: `${key} must have includeForEmbedding=true` });
      }
    }
    const mustNotEmbed: Array<[string, StringAttribute | undefined]> = [
      ["source_url", a.source_url],
      ["canonical_url", a.canonical_url],
      ["source_type", a.source_type],
      ["last_checked", a.last_checked],
      ["effective_date", a.effective_date],
      ["document_version", a.document_version],
    ];
    for (const [key, attr] of mustNotEmbed) {
      if (attr && attr.includeForEmbedding) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: `${key} must have includeForEmbedding=false` });
      }
    }
    // keywords, when present, are retrieval-facing and must be embedded.
    if (a.keywords && !a.keywords.includeForEmbedding) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "keywords must have includeForEmbedding=true" });
    }
    // Grounding: source/canonical URLs must be approved official HTTPS URLs.
    if (!isApprovedOfficialUrl(a.source_url.value.stringValue)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "source_url must be an approved official HTTPS URL" });
    }
    if (!isApprovedOfficialUrl(a.canonical_url.value.stringValue)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "canonical_url must be an approved official HTTPS URL" });
    }
  });

export type ValidatedMetadataSidecar = z.infer<typeof metadataSidecarSchema>;
