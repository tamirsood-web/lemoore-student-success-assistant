import { describe, it, expect } from "vitest";
import {
  BEDROCK_DATA_SOURCE_METADATA_KEY,
  resolveScopeFilter,
  canonicalUrlForMatch,
  urlMatchesExpected,
  urlMatchesExpectedStrict,
  classifyOrigin,
  dedupeRetrieved,
  looksStale,
  evaluateQuestion,
  buildComparison,
  renderComparisonMarkdown,
  isRetrievalScope,
  type RetrievedResult,
  type ScopeReport,
} from "./evaluation";

const S3_ID = "S3DATASRC01";
const CRAWLER_ID = "WEBCRAWLER9";
const IDS = { s3: S3_ID, crawler: CRAWLER_ID };

function result(overrides: Partial<RetrievedResult> & { rank: number }): RetrievedResult {
  return {
    title: "(untitled)",
    url: undefined,
    score: undefined,
    origin: "unknown",
    currentStatus: undefined,
    wrongCampus: false,
    ...overrides,
  };
}

describe("scope → retrieval filter", () => {
  it("combined scope sends NO data-source filter", () => {
    const r = resolveScopeFilter("combined", IDS);
    expect(r.ok).toBe(true);
    expect(r.ok && r.filter).toBeUndefined();
  });

  it("s3 scope filters on the reserved key with the S3 data-source id", () => {
    const r = resolveScopeFilter("s3", IDS);
    expect(r.ok).toBe(true);
    expect(r.ok && r.filter).toEqual({
      equals: { key: BEDROCK_DATA_SOURCE_METADATA_KEY, value: S3_ID },
    });
  });

  it("crawler scope filters on the reserved key with the crawler data-source id", () => {
    const r = resolveScopeFilter("crawler", IDS);
    expect(r.ok).toBe(true);
    expect(r.ok && r.filter).toEqual({
      equals: { key: BEDROCK_DATA_SOURCE_METADATA_KEY, value: CRAWLER_ID },
    });
  });

  it("crawler scope safely rejects a MISSING crawler configuration", () => {
    const r = resolveScopeFilter("crawler", { s3: S3_ID });
    expect(r.ok).toBe(false);
    expect(r.ok === false && r.error).toMatch(/BEDROCK_WEB_CRAWLER_DATA_SOURCE_ID/);
  });

  it("crawler id is NOT required for combined or s3 scopes", () => {
    expect(resolveScopeFilter("combined", {}).ok).toBe(true);
    expect(resolveScopeFilter("s3", { s3: S3_ID }).ok).toBe(true);
  });

  it("s3 scope rejects a missing S3 id", () => {
    const r = resolveScopeFilter("s3", { crawler: CRAWLER_ID });
    expect(r.ok).toBe(false);
    expect(r.ok === false && r.error).toMatch(/BEDROCK_DATA_SOURCE_ID/);
  });

  it("recognizes valid scope names", () => {
    expect(isRetrievalScope("combined")).toBe(true);
    expect(isRetrievalScope("s3")).toBe(true);
    expect(isRetrievalScope("crawler")).toBe(true);
    expect(isRetrievalScope("both")).toBe(false);
  });
});

describe("data-source id privacy", () => {
  it("never places a data-source id into the resolved filter's KEY, only the reserved key", () => {
    const r = resolveScopeFilter("crawler", IDS);
    expect(r.ok && r.filter?.equals.key).toBe(BEDROCK_DATA_SOURCE_METADATA_KEY);
  });

  it("origin attribution returns only labels, never the raw id", () => {
    const origin = classifyOrigin({ dataSourceId: CRAWLER_ID, ids: IDS });
    expect(origin).toBe("crawler");
    expect(["s3", "crawler", "unknown"]).toContain(origin);
  });
});

describe("canonical URL variant matching", () => {
  it("treats index.php, trailing slash, and bare directory as the same page", () => {
    const a = "https://lemoorecollege.edu/admissions/";
    const b = "https://lemoorecollege.edu/admissions/index.php";
    const c = "https://lemoorecollege.edu/admissions";
    expect(canonicalUrlForMatch(a)).toBe(canonicalUrlForMatch(b));
    expect(canonicalUrlForMatch(b)).toBe(canonicalUrlForMatch(c));
  });

  it("matches http vs https and default.aspx variants", () => {
    expect(
      urlMatchesExpected("http://lemoorecollege.edu/schedule/index.html", [
        "https://lemoorecollege.edu/schedule/",
      ]),
    ).toBe(true);
  });

  it("does NOT match a different child page (wrong-topic stays unusable)", () => {
    expect(
      urlMatchesExpected("https://lemoorecollege.edu/admissions/financial-aid/faqs.php", [
        "https://lemoorecollege.edu/admissions/financial-aid/apply.php",
      ]),
    ).toBe(false);
  });

  it("strict matcher does NOT collapse index.php (proves the correction is real)", () => {
    expect(
      urlMatchesExpectedStrict("https://lemoorecollege.edu/admissions/index.php", [
        "https://lemoorecollege.edu/admissions/",
      ]),
    ).toBe(false);
    expect(
      urlMatchesExpected("https://lemoorecollege.edu/admissions/index.php", [
        "https://lemoorecollege.edu/admissions/",
      ]),
    ).toBe(true);
  });
});

describe("origin classification", () => {
  it("uses the reserved-key id first", () => {
    expect(classifyOrigin({ dataSourceId: S3_ID, ids: IDS })).toBe("s3");
    expect(classifyOrigin({ dataSourceId: CRAWLER_ID, ids: IDS })).toBe("crawler");
  });
  it("falls back to location type, then URI presence", () => {
    expect(classifyOrigin({ locationType: "WEB", ids: IDS })).toBe("crawler");
    expect(classifyOrigin({ locationType: "S3", ids: IDS })).toBe("s3");
    expect(classifyOrigin({ hasS3Uri: true, ids: IDS })).toBe("s3");
    expect(classifyOrigin({ hasWebUrl: true, ids: IDS })).toBe("crawler");
    expect(classifyOrigin({ ids: IDS })).toBe("unknown");
  });
});

describe("cross-source deduplication", () => {
  it("collapses the same page from S3 and crawler into one entry flagged as a cross-source duplicate", () => {
    const results: RetrievedResult[] = [
      result({ rank: 1, url: "https://lemoorecollege.edu/helpdesk/", origin: "s3" }),
      result({ rank: 2, url: "https://lemoorecollege.edu/helpdesk/index.php", origin: "crawler" }),
      result({ rank: 3, url: "https://lemoorecollege.edu/portal/", origin: "crawler" }),
    ];
    const out = dedupeRetrieved(results);
    expect(out.results).toHaveLength(2);
    expect(out.removed).toBe(1);
    expect(out.crossSourceDuplicates).toBe(1);
    expect(out.results[0]?.duplicateAcrossSources).toBe(true);
    expect(out.results[0]?.origins.sort()).toEqual(["crawler", "s3"]);
  });

  it("does not count the same page twice for usability", () => {
    const results: RetrievedResult[] = [
      result({ rank: 1, url: "https://lemoorecollege.edu/resources/counseling/", origin: "s3" }),
      result({ rank: 2, url: "https://lemoorecollege.edu/resources/counseling/index.php", origin: "crawler" }),
    ];
    const out = dedupeRetrieved(results);
    expect(out.results).toHaveLength(1);
  });

  it("dedupes untitled URL-less results by title fingerprint", () => {
    const results: RetrievedResult[] = [
      result({ rank: 1, title: "Financial Aid Handbook", origin: "crawler" }),
      result({ rank: 2, title: "financial aid handbook", origin: "crawler" }),
    ];
    expect(dedupeRetrieved(results).results).toHaveLength(1);
  });
});

describe("staleness heuristic", () => {
  it("flags old catalog editions and historical status", () => {
    expect(looksStale("https://lemoorecollege.edu/catalog/documents/2004-2005_whcl.pdf", undefined, 2026)).toBe(true);
    expect(looksStale("https://lemoorecollege.edu/admissions/", "historical", 2026)).toBe(true);
  });
  it("does not flag current pages", () => {
    expect(looksStale("https://lemoorecollege.edu/admissions/financial-aid/", "current", 2026)).toBe(false);
    expect(looksStale("https://lemoorecollege.edu/resources/transfer-center/documents/uc-transfer-guide-25-26.pdf", undefined, 2026)).toBe(false);
  });
});

describe("evaluateQuestion", () => {
  const question = {
    id: "q01",
    question: "How do I apply?",
    expectedTopic: "admissions",
    expectedSourceUrls: ["https://lemoorecollege.edu/admissions/"],
  };

  it("marks usable and reports deduped rank + matched origin", () => {
    const evalResult = evaluateQuestion({
      question,
      scope: "combined",
      currentYear: 2026,
      retrieved: [
        result({ rank: 1, url: "https://lemoorecollege.edu/catalog/documents/2004-2005_whcl.pdf", origin: "crawler", currentStatus: "historical" }),
        result({ rank: 2, url: "https://lemoorecollege.edu/admissions/index.php", origin: "crawler", score: 0.5 }),
      ],
    });
    expect(evalResult.usable).toBe(true);
    expect(evalResult.rank).toBe(2);
    expect(evalResult.matchedOrigin).toBe("crawler");
    expect(evalResult.evaluatorMatchingCorrected).toBe(true); // index.php only matched by improved matcher
    expect(evalResult.failureClassification).toBeNull();
  });

  it("classifies an all-stale result set as stale-source", () => {
    const evalResult = evaluateQuestion({
      question,
      scope: "combined",
      currentYear: 2026,
      retrieved: [
        result({ rank: 1, url: "https://lemoorecollege.edu/catalog/documents/2004-2005_whcl.pdf", origin: "crawler" }),
        result({ rank: 2, url: "https://lemoorecollege.edu/catalog/documents/2002-2003_whc.pdf", origin: "crawler" }),
      ],
    });
    expect(evalResult.usable).toBe(false);
    expect(evalResult.failureClassification).toBe("stale-source");
  });

  it("classifies an unrelated current top hit as wrong-topic", () => {
    const evalResult = evaluateQuestion({
      question,
      scope: "combined",
      currentYear: 2026,
      retrieved: [
        result({ rank: 1, url: "https://lemoorecollege.edu/resources/library/", origin: "s3", currentStatus: "current" }),
      ],
    });
    expect(evalResult.usable).toBe(false);
    expect(evalResult.failureClassification).toBe("wrong-topic");
  });
});

describe("buildComparison", () => {
  function scopeReport(scope: "combined" | "s3" | "crawler", usableIds: string[]): ScopeReport {
    const ids = ["q01", "q02"];
    const questions = ids.map((id) =>
      evaluateQuestion({
        question: {
          id,
          question: `question ${id}`,
          expectedTopic: id === "q01" ? "admissions" : "registration",
          expectedSourceUrls: [`https://lemoorecollege.edu/${id}/`],
        },
        scope,
        currentYear: 2026,
        retrieved: usableIds.includes(id)
          ? [result({ rank: 1, url: `https://lemoorecollege.edu/${id}/`, origin: scope === "crawler" ? "crawler" : "s3" })]
          : [result({ rank: 1, url: "https://lemoorecollege.edu/catalog/documents/2003_2004/x.pdf", origin: "crawler" })],
      }),
    );
    return { scope, generatedAt: "2026-07-22T00:00:00.000Z", total: 2, usable: usableIds.length, questions };
  }

  it("compares three scopes and refines combined failures ranked-too-low when s3 succeeds", () => {
    const cmp = buildComparison(
      {
        combined: scopeReport("combined", ["q01"]),
        s3: scopeReport("s3", ["q01", "q02"]),
        crawler: scopeReport("crawler", []),
      },
      "2026-07-22T00:00:00.000Z",
    );
    expect(cmp.scopesPresent).toEqual(["combined", "s3", "crawler"]);
    expect(cmp.totals.usableByScope).toEqual({ combined: 1, s3: 2, crawler: 0 });
    const q02 = cmp.rows.find((r) => r.id === "q02")!;
    expect(q02.usableByScope).toEqual({ combined: false, s3: true, crawler: false });
    expect(q02.combinedFailureClassification).toBe("correct-source-ranked-too-low");
  });

  it("records missing scopes without treating them as failures", () => {
    const cmp = buildComparison({ combined: scopeReport("combined", ["q01"]) }, "2026-07-22T00:00:00.000Z");
    expect(cmp.scopesMissing).toEqual(["s3", "crawler"]);
    expect(cmp.totals.usableByScope.s3).toBeNull();
    const md = renderComparisonMarkdown(cmp);
    expect(md).toContain("Lemoore retrieval three-way comparison");
    expect(md).not.toContain(S3_ID);
    expect(md).not.toContain(CRAWLER_ID);
  });

  it("redacts KB and data-source ids in the comparison object", () => {
    const cmp = buildComparison({ combined: scopeReport("combined", ["q01"]) }, "2026-07-22T00:00:00.000Z");
    expect(cmp.knowledgeBaseId).toBe("<redacted>");
    expect(cmp.dataSourceIds).toBe("<redacted>");
  });
});
