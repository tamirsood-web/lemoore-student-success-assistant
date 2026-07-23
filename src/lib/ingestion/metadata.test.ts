import { describe, it, expect } from "vitest";
import {
  buildMetadataSidecar,
  metadataSidecarSchema,
  EMBEDDED_METADATA_KEYS,
  type MetadataInput,
} from "./metadata";
import { metadataFileName } from "./filenames";

const base: MetadataInput = {
  sourceUrl: "https://lemoorecollege.edu/admissions/financial-aid/",
  pageTitle: "Financial Aid",
  department: "Financial Aid",
  topic: "financial-aid",
  sourceType: "official-web-page",
  canonicalUrl: "https://lemoorecollege.edu/admissions/financial-aid/",
  lastChecked: "2026-07-22",
  currentStatus: "current",
};

describe("metadataFileName", () => {
  it("appends .metadata.json to the exact source filename (HTML)", () => {
    expect(metadataFileName("financial-aid.md")).toBe("financial-aid.md.metadata.json");
  });
  it("appends .metadata.json to the exact source filename (PDF)", () => {
    expect(metadataFileName("academic-calendar.pdf")).toBe("academic-calendar.pdf.metadata.json");
  });
});

describe("buildMetadataSidecar", () => {
  it("produces typed STRING attributes for all required fields", () => {
    const sidecar = buildMetadataSidecar(base);
    const a = sidecar.metadataAttributes;
    expect(a.source_url.value).toEqual({ type: "STRING", stringValue: base.sourceUrl });
    expect(a.page_title.value.stringValue).toBe("Financial Aid");
    expect(a.department.value.stringValue).toBe("Financial Aid");
    expect(a.topic.value.stringValue).toBe("financial-aid");
    expect(a.canonical_url.value.stringValue).toBe(base.canonicalUrl);
    expect(a.source_type.value.stringValue).toBe("official-web-page");
    expect(a.last_checked.value.stringValue).toBe("2026-07-22");
    expect(a.current_status.value.stringValue).toBe("current");
  });

  it("includes title/department/topic for embedding", () => {
    const a = buildMetadataSidecar(base).metadataAttributes;
    for (const key of EMBEDDED_METADATA_KEYS) {
      expect(a[key]?.includeForEmbedding).toBe(true);
    }
  });

  it("excludes source_url/canonical_url/source_type/last_checked from embedding", () => {
    const a = buildMetadataSidecar(base).metadataAttributes;
    expect(a.source_url.includeForEmbedding).toBe(false);
    expect(a.canonical_url.includeForEmbedding).toBe(false);
    expect(a.source_type.includeForEmbedding).toBe(false);
    expect(a.last_checked.includeForEmbedding).toBe(false);
  });

  it("preserves the exact source URL (no rewriting)", () => {
    const a = buildMetadataSidecar(base).metadataAttributes;
    expect(a.source_url.value.stringValue).toBe(base.sourceUrl);
  });

  it("adds effective_date/document_version only when provided (non-embedding)", () => {
    const a = buildMetadataSidecar({
      ...base,
      effectiveDate: "2025-09-01",
      documentVersion: "2026-2027",
    }).metadataAttributes;
    expect(a.effective_date?.value.stringValue).toBe("2025-09-01");
    expect(a.effective_date?.includeForEmbedding).toBe(false);
    expect(a.document_version?.value.stringValue).toBe("2026-2027");
  });

  it("omits effective_date/document_version when not verified", () => {
    const a = buildMetadataSidecar(base).metadataAttributes;
    expect(a.effective_date).toBeUndefined();
    expect(a.document_version).toBeUndefined();
  });

  it("refuses an off-domain source_url", () => {
    expect(() => buildMetadataSidecar({ ...base, sourceUrl: "https://evil.com/x" })).toThrow();
  });

  it("refuses a non-HTTPS/internal canonical_url", () => {
    expect(() => buildMetadataSidecar({ ...base, canonicalUrl: "s3://bucket/key" })).toThrow();
  });

  it("adds keywords as an embedded STRING_LIST when provided", () => {
    const a = buildMetadataSidecar({ ...base, keywords: ["tuition", "fees", "payment"] }).metadataAttributes;
    expect(a.keywords?.value.type).toBe("STRING_LIST");
    expect(a.keywords?.value.stringListValue).toEqual(["tuition", "fees", "payment"]);
    expect(a.keywords?.includeForEmbedding).toBe(true);
  });

  it("omits keywords when none are provided or the list is empty", () => {
    expect(buildMetadataSidecar(base).metadataAttributes.keywords).toBeUndefined();
    expect(buildMetadataSidecar({ ...base, keywords: [] }).metadataAttributes.keywords).toBeUndefined();
  });

  it("PDF documents retain full metadata", () => {
    const a = buildMetadataSidecar({
      ...base,
      sourceUrl: "https://lemoorecollege.edu/documents/final_exam_schedule.pdf",
      canonicalUrl: "https://lemoorecollege.edu/documents/final_exam_schedule.pdf",
      sourceType: "official-pdf",
      pageTitle: "Final Exam Schedule",
      topic: "academic-calendar",
    }).metadataAttributes;
    expect(a.source_type.value.stringValue).toBe("official-pdf");
    expect(a.source_url.value.stringValue).toContain(".pdf");
    expect(a.page_title.includeForEmbedding).toBe(true);
  });
});

describe("metadataSidecarSchema", () => {
  it("accepts a well-formed sidecar", () => {
    const sidecar = buildMetadataSidecar(base);
    expect(metadataSidecarSchema.safeParse(sidecar).success).toBe(true);
  });

  it("rejects a sidecar missing source_url", () => {
    const sidecar = buildMetadataSidecar(base) as unknown as {
      metadataAttributes: Record<string, unknown>;
    };
    delete sidecar.metadataAttributes.source_url;
    expect(metadataSidecarSchema.safeParse(sidecar).success).toBe(false);
  });

  it("rejects a sidecar that embeds source_url", () => {
    const sidecar = buildMetadataSidecar(base);
    sidecar.metadataAttributes.source_url.includeForEmbedding = true;
    expect(metadataSidecarSchema.safeParse(sidecar).success).toBe(false);
  });

  it("rejects a sidecar that fails to embed page_title", () => {
    const sidecar = buildMetadataSidecar(base);
    sidecar.metadataAttributes.page_title.includeForEmbedding = false;
    expect(metadataSidecarSchema.safeParse(sidecar).success).toBe(false);
  });

  it("accepts a sidecar with embedded keywords", () => {
    const sidecar = buildMetadataSidecar({ ...base, keywords: ["tuition", "fees"] });
    expect(metadataSidecarSchema.safeParse(sidecar).success).toBe(true);
  });

  it("rejects a sidecar whose keywords are not embedded", () => {
    const sidecar = buildMetadataSidecar({ ...base, keywords: ["tuition"] });
    sidecar.metadataAttributes.keywords!.includeForEmbedding = false;
    expect(metadataSidecarSchema.safeParse(sidecar).success).toBe(false);
  });
});
