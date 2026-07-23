// Topic → output-category mapping (pure; server/script-only).
//
// The Bedrock corpus is organized into a fixed set of top-level categories (folders). This
// module maps a manifest record's `topic`/`department` to exactly one category so the output
// tree is deterministic and reviewable. Categories are a LOCAL organizational convenience;
// they are unrelated to the source URL path (and never widen the approved-domain rule).

/** The fixed output categories (also the folder names under data/bedrock/lemoore/). */
export const OUTPUT_CATEGORIES = [
  "admissions",
  "financial-aid",
  "registration",
  "academics",
  "support-services",
  "technology",
  "campus",
  "programs",
  "documents",
] as const;

export type OutputCategory = (typeof OUTPUT_CATEGORIES)[number];

/** Topics that map directly to a category (checked first, exact match on the topic slug). */
const TOPIC_TO_CATEGORY: Record<string, OutputCategory> = {
  admissions: "admissions",
  application: "admissions",
  orientation: "admissions",
  "dual-enrollment": "admissions",
  residency: "admissions",
  "future-students": "admissions",
  "returning-students": "admissions",

  "financial-aid": "financial-aid",
  fafsa: "financial-aid",
  cadaa: "financial-aid",
  "cost-of-attendance": "financial-aid",
  "tuition-and-fees": "financial-aid",
  "grants-and-scholarships": "financial-aid",
  scholarships: "financial-aid",
  refunds: "financial-aid",
  sap: "financial-aid",
  loans: "financial-aid",
  "work-study": "financial-aid",

  registration: "registration",
  "add-drop": "registration",
  transcripts: "registration",
  graduation: "registration",

  "academic-calendar": "academics",
  catalog: "academics",
  "course-schedule": "academics",

  counseling: "support-services",
  tutoring: "support-services",
  library: "support-services",
  transfer: "support-services",
  "career-services": "support-services",
  veterans: "support-services",
  dsps: "support-services",
  eops: "support-services",
  care: "support-services",
  calworks: "support-services",
  "basic-needs": "support-services",
  "mental-health": "support-services",
  "dream-resource-center": "support-services",

  "student-portal": "technology",
  canvas: "technology",
  "student-email": "technology",
  helpdesk: "technology",

  "campus-contact": "campus",
  "campus-map": "campus",
  directory: "campus",

  "degrees-and-certificates": "programs",
  programs: "programs",
};

/** Departments that hint at a category when the topic is unrecognized. */
const DEPARTMENT_HINTS: Array<[RegExp, OutputCategory]> = [
  [/financial aid/i, "financial-aid"],
  [/admissions and records|records/i, "registration"],
  [/admissions/i, "admissions"],
  [/information technology|help ?desk|it /i, "technology"],
  [/library|tutor|counsel|eops|dsps|calworks|veteran|transfer|career|basic needs|dream/i, "support-services"],
];

/**
 * Resolve the output category for a record. `sourceType: "official-pdf"` always lands in
 * `documents`. Otherwise: exact topic match → department hint → `academics` as a safe default.
 */
export function categoryForRecord(input: {
  readonly topic: string;
  readonly department?: string;
  readonly sourceType?: string;
}): OutputCategory {
  if (input.sourceType === "official-pdf" || input.sourceType === "official-document") {
    return "documents";
  }
  const topic = input.topic.trim().toLowerCase();
  const direct = TOPIC_TO_CATEGORY[topic];
  if (direct) return direct;

  if (input.department) {
    for (const [pattern, category] of DEPARTMENT_HINTS) {
      if (pattern.test(input.department)) return category;
    }
  }
  return "academics";
}

/** Type guard for a valid output category string. */
export function isOutputCategory(value: string): value is OutputCategory {
  return (OUTPUT_CATEGORIES as readonly string[]).includes(value);
}
