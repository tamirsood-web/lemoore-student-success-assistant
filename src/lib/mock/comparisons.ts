// Comparison topics dataset (LOCAL DEMO DATA).
//
// Structured data for the "compare options" feature. Each record corresponds to one
// curated comparison topic grounded in an approved mock source. All policy descriptions
// are sample/demo content — they do NOT represent official Lemoore College policy.
//
// Source IDs must match real entries in sources.ts. Adding a new topic requires:
//   1. A new source record in sources.ts with matching tags/content.
//   2. A new ComparisonRecord here referencing that source id.

import type { ComparisonBlockData } from "@/types";
import { MOCK_DATA_DISCLAIMER } from "./sources";

/** A comparison record ties structured UI data to its backing source id. */
export type ComparisonRecord = {
  /**
   * Keywords (lowercase) used to detect whether a query is about this topic.
   * Any match triggers this comparison — keep phrases specific enough to avoid
   * false positives.
   */
  readonly matchPhrases: readonly string[];
  /** The source id in sources.ts that grounds this comparison. */
  readonly sourceId: string;
  /** The structured data rendered by ComparisonBlock. */
  readonly data: ComparisonBlockData;
};

export const comparisons: readonly ComparisonRecord[] = [
  {
    matchPhrases: [
      "drop vs withdraw",
      "drop versus withdraw",
      "dropping vs withdrawing",
      "drop or withdraw",
      "difference between dropping and withdrawing",
      "difference between drop and withdraw",
      "dropping and withdrawing",
      "dropping vs withdraw",
      "drop a class vs withdraw",
    ],
    sourceId: "src_comparison_drop_withdraw",
    data: {
      topic: "Dropping vs. Withdrawing",
      optionA: {
        label: "Dropping",
        explanation:
          "Dropping a class before the census date removes it from your record with no grade and no tuition charge. It is as if you never enrolled. (Sample policy — " +
          MOCK_DATA_DISCLAIMER +
          ")",
      },
      optionB: {
        label: "Withdrawing",
        explanation:
          "Withdrawing after the census date but before the drop deadline results in a \"W\" on your transcript. You are still responsible for tuition and the W does not affect GPA but does appear on your record. (Sample policy — " +
          MOCK_DATA_DISCLAIMER +
          ")",
      },
      keyDifferences: [
        "Timing: dropping is before census date; withdrawing is after census date.",
        "Transcript: drops don't appear on your record; withdrawals show as \"W\".",
        "Tuition: drops may qualify for a refund; withdrawals typically do not.",
        "Always verify exact census and drop dates for your specific course and section.",
      ],
    },
  },
  {
    matchPhrases: [
      "census date vs drop date",
      "census date versus drop date",
      "difference between census date and drop date",
      "census vs drop",
      "census date and drop date",
      "census or drop date",
      "what is the difference between census and drop",
    ],
    sourceId: "src_comparison_census_vs_drop",
    data: {
      topic: "Census Date vs. Drop Date",
      optionA: {
        label: "Census Date",
        explanation:
          "The census date is the official enrollment count date. After this date, financial aid enrollment status is locked and you can no longer drop a class without a \"W\" notation. (Sample policy — " +
          MOCK_DATA_DISCLAIMER +
          ")",
      },
      optionB: {
        label: "Drop Date (Withdrawal Deadline)",
        explanation:
          "The drop date is the last day to withdraw from a class with a \"W\" on your transcript instead of a failing grade. It comes after the census date. (Sample policy — " +
          MOCK_DATA_DISCLAIMER +
          ")",
      },
      keyDifferences: [
        "Purpose: census locks enrollment/financial aid; drop date is the last exit without an F.",
        "Order: census date comes first in the term; drop date comes later.",
        "Financial aid: dropping below full-time after census may affect your aid.",
        "Always check exact dates for your specific course — they vary by section.",
      ],
    },
  },
  {
    matchPhrases: [
      "in-person vs online support",
      "in person vs online support",
      "in-person versus online support",
      "in person or online support",
      "online support vs in-person",
      "difference between in-person and online support",
      "in-person and online support hours",
      "in person and online hours",
    ],
    sourceId: "src_comparison_inperson_online_support",
    data: {
      topic: "In-Person vs. Online Support Hours",
      optionA: {
        label: "In-Person Support",
        explanation:
          "Available at campus offices during regular business hours (sample: Monday–Friday, 8:00 AM–5:00 PM). Some services, like document submission, require an in-person visit. (Sample — " +
          MOCK_DATA_DISCLAIMER +
          ")",
      },
      optionB: {
        label: "Online / Remote Support",
        explanation:
          "Phone and email support may be available beyond standard campus hours. Email responses typically take 1–2 business days (sample). Check the official college website for current remote availability. (Sample — " +
          MOCK_DATA_DISCLAIMER +
          ")",
      },
      keyDifferences: [
        "Availability: in-person is limited to campus hours; online may extend further.",
        "Services: some documents and processes require an in-person visit.",
        "Response time: in-person is immediate; email may take 1–2 business days (sample).",
        "Always confirm current hours on the official Lemoore College website.",
      ],
    },
  },
];

/** Look up a comparison record by matching any phrase against the query. */
export function findComparison(query: string): ComparisonRecord | undefined {
  const lower = query.toLowerCase();
  return comparisons.find((record) =>
    record.matchPhrases.some((phrase) => lower.includes(phrase)),
  );
}
