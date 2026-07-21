// Approved-source knowledge snippets (LOCAL DEMO DATA).
//
// WHAT IS REAL (derived from repository docs):
//   - The set of categories covered (docs/ARCHITECTURE.md → Knowledge Sources) and the
//     student questions these answer (docs/EVAL_QUESTIONS.md → Expected Grounded Answers).
//   - The institution name "Lemoore College".
//
// WHAT IS DEMO CONTENT (invented for local development):
//   - Every specific hour, step, deadline, phone number, email, and URL below. The repo
//     provides no verified values for these, so each record is explicitly labeled sample
//     data via the trailing disclaimer sentence in `content`. Nothing here should be
//     presented as official Lemoore College information.
//
// Keep this dataset small, readable, and deterministic; it is meant to be replaced by an
// approved corpus in a later phase. IDs are stable, lowercase, `src_`-prefixed slugs.

import type { Source } from "@/types";
import type { DepartmentId } from "./departments";

/** Appended to every source snippet so demo content is unmistakable in answers/citations. */
export const MOCK_DATA_DISCLAIMER =
  "Sample demo content for local development — not official Lemoore College information.";

/** Shared title for the sample course-date dataset; referenced by course-date records. */
export const COURSE_DATE_SOURCE_TITLE =
  "Course Census & Drop Dates Dataset (Sample)";

// Authoring-time integrity: `department` must be a real DepartmentId, so a typo cannot
// produce a dangling escalation reference. Exported below as `readonly Source[]`.
type MockSourceRecord = Source & { readonly department: DepartmentId };

const SOURCE_RECORDS: readonly MockSourceRecord[] = [
  {
    id: "src_admissions_office_hours",
    title: "Admissions & Records — Office Hours (Sample)",
    uri: "https://demo.lemoore-college.example/admissions/hours",
    department: "admissions_records",
    audience: "public",
    tags: ["admissions", "office hours", "hours", "records", "enrollment"],
    content: `The Admissions & Records office helps students with applications, enrollment, and official records. Sample office hours: Monday–Friday, 8:00 AM–4:30 PM. ${MOCK_DATA_DISCLAIMER}`,
    lastReviewed: "2025-07-01",
  },
  {
    id: "src_financial_aid_contact",
    title: "Financial Aid — How to Get Help (Sample)",
    uri: "https://demo.lemoore-college.example/financial-aid/contact",
    department: "financial_aid",
    audience: "public",
    tags: ["financial aid", "fafsa", "contact", "grants", "help"],
    content: `You can reach the Financial Aid office by email or phone for questions about aid applications, grants, and disbursement. Sample contact: financialaid@demo.lemoore-college.example. ${MOCK_DATA_DISCLAIMER}`,
    lastReviewed: "2025-07-01",
  },
  {
    id: "src_degree_posting",
    title: "Degree Posting — Where to Find Information (Sample)",
    uri: "https://demo.lemoore-college.example/records/degree-posting",
    department: "admissions_records",
    audience: "public",
    tags: ["degree", "degree posting", "graduation", "records", "diploma"],
    content: `Information about degree posting and graduation status is handled by Admissions & Records. Sample guidance: after final grades are processed, degree posting is typically reviewed by the records team. ${MOCK_DATA_DISCLAIMER}`,
    lastReviewed: "2025-07-01",
  },
  {
    id: "src_transcript_request",
    title: "Transcripts — How to Request or View (Sample)",
    uri: "https://demo.lemoore-college.example/records/transcripts",
    department: "admissions_records",
    audience: "public",
    tags: ["transcript", "transcripts", "records", "request", "official"],
    content: `Students can request official transcripts or view unofficial transcripts through Admissions & Records. Sample steps: sign in to the student portal and select the transcripts option. ${MOCK_DATA_DISCLAIMER}`,
    lastReviewed: "2025-07-01",
  },
  {
    id: "src_registration_help",
    title: "Registration Help — Getting Started (Sample)",
    uri: "https://demo.lemoore-college.example/counseling/registration",
    department: "counseling",
    audience: "public",
    tags: ["registration", "register", "classes", "enrollment", "counseling"],
    content: `Counseling can help you plan and register for classes and build an education plan. Sample guidance: meet with a counselor before your registration date to review prerequisites. ${MOCK_DATA_DISCLAIMER}`,
    lastReviewed: "2025-07-01",
  },
  {
    id: "src_adult_learner_services",
    title: "Adult Learner Services — Overview (Sample)",
    uri: "https://demo.lemoore-college.example/adult-learners",
    department: "adult_learner_services",
    audience: "public",
    tags: ["adult learners", "returning students", "services", "support"],
    content: `Adult Learner Services supports returning and non-traditional students with orientation, scheduling, and support resources. Sample offerings: flexible advising and re-entry guidance. ${MOCK_DATA_DISCLAIMER}`,
    lastReviewed: "2025-07-01",
  },
  {
    id: "src_counseling_contact",
    title: "Counseling — How to Contact (Sample)",
    uri: "https://demo.lemoore-college.example/counseling/contact",
    department: "counseling",
    audience: "public",
    tags: ["counseling", "counselor", "contact", "advising", "appointment"],
    content: `The Counseling office offers academic, career, and personal counseling by appointment. Sample contact: counseling@demo.lemoore-college.example. ${MOCK_DATA_DISCLAIMER}`,
    lastReviewed: "2025-07-01",
  },
  {
    id: "src_academic_calendar",
    title: "Academic Calendar — Where to Find It (Sample)",
    uri: "https://demo.lemoore-college.example/records/academic-calendar",
    department: "admissions_records",
    audience: "public",
    tags: ["academic calendar", "calendar", "dates", "term", "semester"],
    content: `The academic calendar lists term start dates, holidays, and general deadlines and is maintained by Admissions & Records. Sample note: class-specific census and drop dates are not on the general calendar. ${MOCK_DATA_DISCLAIMER}`,
    lastReviewed: "2025-07-01",
  },
  {
    id: "src_office_contacts",
    title: "Student Services — Office Contacts & Hours (Sample)",
    uri: "https://demo.lemoore-college.example/student-services/contacts",
    department: "student_services",
    audience: "public",
    tags: ["contact", "office hours", "hours", "student services", "help desk"],
    content: `Student Services can direct you to the right office for general questions. Sample hours: Monday–Friday, 8:00 AM–5:00 PM. ${MOCK_DATA_DISCLAIMER}`,
    lastReviewed: "2025-07-01",
  },
  {
    id: "src_course_dates_dataset",
    title: COURSE_DATE_SOURCE_TITLE,
    uri: "https://demo.lemoore-college.example/records/course-dates",
    department: "admissions_records",
    audience: "public",
    tags: [
      "census date",
      "drop date",
      "withdrawal",
      "course dates",
      "deadline",
    ],
    content: `Class-specific census and drop dates vary by course, section, and term and must be matched exactly — they are not the same as the general academic calendar. Provide your term, subject, catalog number, and section for an exact match. ${MOCK_DATA_DISCLAIMER}`,
    lastReviewed: "2025-07-01",
  },
];

/** All approved-source snippets (local demo data). */
export const sources: readonly Source[] = SOURCE_RECORDS;

/** Lookup map from source id to source record. */
export const sourceById: ReadonlyMap<string, Source> = new Map(
  SOURCE_RECORDS.map((source) => [source.id, source]),
);

/** Set of all source titles; used to validate course-date source references. */
export const sourceTitles: ReadonlySet<string> = new Set(
  SOURCE_RECORDS.map((source) => source.title),
);

/** Return a source by id, or `undefined` if unknown. */
export function getSourceById(id: string): Source | undefined {
  return sourceById.get(id);
}
