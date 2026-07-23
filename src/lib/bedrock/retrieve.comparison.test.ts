// Comparison intent detection and retrieval tests.
//
// Covers: supported topic lookups, unsupported topic escalation, structured data
// shape, and that comparison intent doesn't bleed into course-date scoring.

import { retrieve } from "./retrieve";
import type { RetrievalResult } from "@/types";

async function get(query: string): Promise<RetrievalResult> {
  return retrieve(query);
}

describe("retrieve — comparison intent", () => {
  describe("drop vs withdraw", () => {
    it("detects the intent for 'difference between dropping and withdrawing'", async () => {
      const result = await get("What's the difference between dropping and withdrawing?");
      expect(result.intent).toBe("comparison");
    });

    it("returns a grounded snippet", async () => {
      const result = await get("What's the difference between dropping and withdrawing?");
      expect(result.snippets.length).toBeGreaterThan(0);
    });

    it("populates comparisonBlock with the correct topic", async () => {
      const result = await get("What's the difference between dropping and withdrawing?");
      expect(result.comparisonBlock?.topic).toBe("Dropping vs. Withdrawing");
    });

    it("populates optionA and optionB", async () => {
      const result = await get("What's the difference between dropping and withdrawing?");
      expect(result.comparisonBlock?.optionA.label).toBe("Dropping");
      expect(result.comparisonBlock?.optionB.label).toBe("Withdrawing");
      expect(result.comparisonBlock?.optionA.explanation.length).toBeGreaterThan(0);
      expect(result.comparisonBlock?.optionB.explanation.length).toBeGreaterThan(0);
    });

    it("populates keyDifferences with at least one bullet", async () => {
      const result = await get("What's the difference between dropping and withdrawing?");
      expect(result.comparisonBlock?.keyDifferences.length).toBeGreaterThan(0);
    });

    it("matches the 'drop vs withdraw' shorthand", async () => {
      const result = await get("drop vs withdraw — which should I do?");
      expect(result.intent).toBe("comparison");
      expect(result.comparisonBlock?.topic).toBe("Dropping vs. Withdrawing");
    });
  });

  describe("census date vs drop date", () => {
    it("detects intent for 'difference between census date and drop date'", async () => {
      const result = await get("What is the difference between census date and drop date?");
      expect(result.intent).toBe("comparison");
      expect(result.comparisonBlock?.topic).toBe("Census Date vs. Drop Date");
    });

    it("populates both options for census vs drop", async () => {
      const result = await get("census date vs drop date, what does each mean?");
      expect(result.comparisonBlock?.optionA.label).toBe("Census Date");
      expect(result.comparisonBlock?.optionB.label).toBe("Drop Date (Withdrawal Deadline)");
    });
  });

  describe("in-person vs online support", () => {
    it("detects intent for in-person vs online support", async () => {
      const result = await get("What is the difference between in-person and online support hours?");
      expect(result.intent).toBe("comparison");
      expect(result.comparisonBlock?.topic).toBe("In-Person vs. Online Support Hours");
    });
  });

  describe("unsupported comparison topic", () => {
    it("returns empty snippets for an unsupported comparison — safe escalation path", async () => {
      const result = await get("compare semester vs trimester calendar systems");
      // isComparisonIntent fires on "compare", findComparison finds no match → empty snippets
      expect(result.intent).toBe("comparison");
      expect(result.snippets).toHaveLength(0);
      expect(result.comparisonBlock).toBeUndefined();
    });
  });

  it("does NOT return a locationCard for a comparison query", async () => {
    const result = await get("What's the difference between dropping and withdrawing?");
    expect(result.locationCard).toBeUndefined();
  });

  it("snippet sourceId references a real source", async () => {
    const { getSourceById } = await import("@/lib/mock");
    const result = await get("What's the difference between dropping and withdrawing?");
    for (const snippet of result.snippets) {
      if ("id" in snippet.source) {
        expect(getSourceById(snippet.source.id)).toBeDefined();
      }
    }
  });
});
