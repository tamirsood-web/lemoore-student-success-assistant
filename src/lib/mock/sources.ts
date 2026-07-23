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
  // --- Location / "where to go" sources -------------------------------------------
  {
    id: "src_location_admissions",
    title: "Admissions & Records — Location & Hours (Sample)",
    uri: "https://demo.lemoore-college.example/admissions/location",
    department: "admissions_records",
    audience: "public",
    tags: [
      "admissions",
      "records",
      "where",
      "location",
      "building",
      "office",
      "directions",
      "map",
      "room",
      "find",
    ],
    content: `The Admissions & Records office is located in the Administration Building, Room 101 (sample location). Sample hours: Monday–Friday, 8:00 AM–4:30 PM. For directions, see the campus map at https://lemoorecollege.edu/map/ — this is a demo location only. ${MOCK_DATA_DISCLAIMER}`,
    lastReviewed: "2025-07-01",
  },
  {
    id: "src_location_financial_aid",
    title: "Financial Aid — Location & Hours (Sample)",
    uri: "https://demo.lemoore-college.example/financial-aid/location",
    department: "financial_aid",
    audience: "public",
    tags: [
      "financial aid",
      "where",
      "location",
      "building",
      "office",
      "directions",
      "map",
      "room",
      "find",
      "fafsa",
    ],
    content: `The Financial Aid office is located in the Student Services Building, Room 205 (sample location). Sample hours: Monday–Friday, 8:00 AM–5:00 PM. Campus map: https://lemoorecollege.edu/map/ — this is a demo location only. ${MOCK_DATA_DISCLAIMER}`,
    lastReviewed: "2025-07-01",
  },
  {
    id: "src_location_counseling",
    title: "Counseling — Location & Hours (Sample)",
    uri: "https://demo.lemoore-college.example/counseling/location",
    department: "counseling",
    audience: "public",
    tags: [
      "counseling",
      "counselor",
      "where",
      "location",
      "building",
      "office",
      "directions",
      "map",
      "room",
      "find",
      "advising",
    ],
    content: `The Counseling Center is located in the Counseling Center building, Room 110 (sample location). Sample hours: Monday–Friday, 8:00 AM–5:00 PM, by appointment. Campus map: https://lemoorecollege.edu/map/ — this is a demo location only. ${MOCK_DATA_DISCLAIMER}`,
    lastReviewed: "2025-07-01",
  },
  {
    id: "src_location_student_services",
    title: "Student Services — Location & Hours (Sample)",
    uri: "https://demo.lemoore-college.example/student-services/location",
    department: "student_services",
    audience: "public",
    tags: [
      "student services",
      "where",
      "location",
      "building",
      "office",
      "directions",
      "map",
      "room",
      "find",
      "help",
    ],
    content: `Student Services is located in the Student Services Building, Main Lobby (sample location). Sample hours: Monday–Friday, 8:00 AM–5:00 PM. Campus map: https://lemoorecollege.edu/map/ — this is a demo location only. ${MOCK_DATA_DISCLAIMER}`,
    lastReviewed: "2025-07-01",
  },
  // --- Comparison / "difference between" sources ----------------------------------
  {
    id: "src_comparison_drop_withdraw",
    title: "Dropping vs. Withdrawing — What's the Difference? (Sample)",
    uri: "https://demo.lemoore-college.example/records/drop-vs-withdraw",
    department: "admissions_records",
    audience: "public",
    tags: [
      "drop",
      "withdraw",
      "withdrawal",
      "difference",
      "compare",
      "versus",
      "vs",
      "dropping",
      "withdrawing",
      "census date",
      "drop date",
      "deadline",
      "transcript",
      "grade",
      "refund",
    ],
    content: `Dropping a class before the census date removes it from your record with no grade or tuition charge (sample policy). Withdrawing after the census date but before the drop deadline results in a "W" on your transcript and no refund (sample policy). Key differences: (1) Timing — dropping is before census, withdrawing is after. (2) Transcript impact — drops don't appear; withdrawals show as "W". (3) Financial impact — drops may qualify for a refund; withdrawals typically do not. Always verify exact dates for your specific course and section. ${MOCK_DATA_DISCLAIMER}`,
    lastReviewed: "2025-07-01",
  },
  {
    id: "src_comparison_census_vs_drop",
    title: "Census Date vs. Drop Date — What's the Difference? (Sample)",
    uri: "https://demo.lemoore-college.example/records/census-vs-drop-date",
    department: "admissions_records",
    audience: "public",
    tags: [
      "census date",
      "drop date",
      "difference",
      "compare",
      "versus",
      "vs",
      "deadline",
      "enrollment",
      "financial aid",
    ],
    content: `The census date is the official enrollment count date — after this date, financial aid enrollment status is locked and dropping a class without a "W" is no longer possible (sample policy). The drop date (also called the withdrawal deadline) is the last day to drop a class with a "W" notation rather than a failing grade (sample policy). Key differences: (1) Purpose — census locks enrollment/financial aid; drop date is the last chance to exit without an F. (2) Order — census date comes first; drop date comes later in the term. (3) Financial aid — dropping below full-time after census may affect aid. Always verify exact dates for your specific course. ${MOCK_DATA_DISCLAIMER}`,
    lastReviewed: "2025-07-01",
  },
  {
    id: "src_comparison_inperson_online_support",
    title: "In-Person vs. Online Support Hours — What's the Difference? (Sample)",
    uri: "https://demo.lemoore-college.example/student-services/support-hours",
    department: "student_services",
    audience: "public",
    tags: [
      "in-person",
      "online",
      "support hours",
      "difference",
      "compare",
      "versus",
      "vs",
      "remote",
      "virtual",
      "office hours",
      "help",
      "student services",
    ],
    content: `In-person support is available at the Student Services Building during sample hours: Monday–Friday, 8:00 AM–5:00 PM. Online/virtual support (phone and email) may have extended availability — check the official website for current details. Key differences: (1) Availability — in-person is limited to campus hours; online may extend beyond those hours. (2) Services — some documents and processes require an in-person visit. (3) Response time — in-person is immediate; email responses may take 1–2 business days (sample). Always confirm current hours on the official college website. ${MOCK_DATA_DISCLAIMER}`,
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
