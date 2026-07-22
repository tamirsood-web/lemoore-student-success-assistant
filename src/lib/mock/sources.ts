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
// This dataset is intentionally broad (see the demo brief) so judges can ask many kinds of
// student questions and get grounded, cited answers. It powers BOTH the chat retrieval
// (src/lib/bedrock/retrieve.ts) and the website search (src/lib/search). It is meant to be
// replaced by an approved corpus / Bedrock Knowledge Base in a later phase. IDs are stable,
// lowercase, `src_`-prefixed slugs.

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
  // --- Admissions & Records ---------------------------------------------------------
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
    id: "src_admissions_apply",
    title: "Admissions — How to Apply (Sample)",
    uri: "https://demo.lemoore-college.example/admissions/apply",
    department: "admissions_records",
    audience: "public",
    tags: ["admissions", "apply", "application", "new students", "enroll"],
    content: `New and returning students apply online through the college application portal, then complete orientation and meet with a counselor. Sample steps: submit the application, receive your student ID by email, then register for classes. ${MOCK_DATA_DISCLAIMER}`,
    lastReviewed: "2025-07-01",
  },
  {
    id: "src_residency",
    title: "Residency Requirements — Overview (Sample)",
    uri: "https://demo.lemoore-college.example/admissions/residency",
    department: "admissions_records",
    audience: "public",
    tags: ["residency", "resident", "tuition", "in-state", "enrollment"],
    content: `Residency status affects tuition and is determined from information provided during admission. Sample guidance: bring documentation of California residency to Admissions & Records to review your status. ${MOCK_DATA_DISCLAIMER}`,
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
    id: "src_graduation",
    title: "Graduation & Commencement — Overview (Sample)",
    uri: "https://demo.lemoore-college.example/records/graduation",
    department: "admissions_records",
    audience: "public",
    tags: ["graduation", "commencement", "petition", "diploma", "ceremony"],
    content: `Students planning to graduate submit a graduation petition and review remaining requirements with a counselor. Sample note: filing deadlines for the petition are posted each term by Admissions & Records. ${MOCK_DATA_DISCLAIMER}`,
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

  // --- Financial Aid ----------------------------------------------------------------
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
    id: "src_fafsa_apply",
    title: "FAFSA & Financial Aid Application — Getting Started (Sample)",
    uri: "https://demo.lemoore-college.example/financial-aid/fafsa",
    department: "financial_aid",
    audience: "public",
    tags: ["fafsa", "financial aid", "application", "dream act", "grants"],
    content: `Most students start financial aid by completing the FAFSA (or the California Dream Act Application). Sample guidance: submit as early as possible each year and list Lemoore College's school code so your information is shared with the Financial Aid office. ${MOCK_DATA_DISCLAIMER}`,
    lastReviewed: "2025-07-01",
  },
  {
    id: "src_scholarships",
    title: "Scholarships — How to Find and Apply (Sample)",
    uri: "https://demo.lemoore-college.example/financial-aid/scholarships",
    department: "financial_aid",
    audience: "public",
    tags: ["scholarships", "scholarship", "awards", "financial aid", "apply"],
    content: `Scholarships are offered through the college foundation and outside organizations. Sample guidance: complete the general scholarship application each year to be considered for multiple awards with one form. ${MOCK_DATA_DISCLAIMER}`,
    lastReviewed: "2025-07-01",
  },

  // --- Counseling & Registration ----------------------------------------------------
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
    id: "src_orientation",
    title: "New Student Orientation — Overview (Sample)",
    uri: "https://demo.lemoore-college.example/counseling/orientation",
    department: "counseling",
    audience: "public",
    tags: ["orientation", "new students", "getting started", "onboarding"],
    content: `New student orientation introduces campus resources, registration, and support services. Sample guidance: complete orientation online or in person before meeting a counselor to plan your first term. ${MOCK_DATA_DISCLAIMER}`,
    lastReviewed: "2025-07-01",
  },

  // --- Transfer & Career ------------------------------------------------------------
  {
    id: "src_transfer_center",
    title: "Transfer Center — Overview (Sample)",
    uri: "https://demo.lemoore-college.example/transfer",
    department: "transfer_center",
    audience: "public",
    tags: ["transfer", "university", "csu", "uc", "transfer center"],
    content: `The Transfer Center helps students plan transfer to a university, including CSU and UC pathways and transfer agreements. Sample guidance: meet with a transfer counselor to review lower-division requirements for your major. ${MOCK_DATA_DISCLAIMER}`,
    lastReviewed: "2025-07-01",
  },
  {
    id: "src_career_center",
    title: "Career Center — Overview (Sample)",
    uri: "https://demo.lemoore-college.example/career",
    department: "career_center",
    audience: "public",
    tags: ["career", "jobs", "resume", "internship", "career center"],
    content: `The Career Center offers career exploration, resume help, and job and internship resources. Sample offerings: drop-in resume reviews and a student job board. ${MOCK_DATA_DISCLAIMER}`,
    lastReviewed: "2025-07-01",
  },

  // --- Library, Tutoring, Bookstore -------------------------------------------------
  {
    id: "src_library",
    title: "Library — Services & Hours (Sample)",
    uri: "https://demo.lemoore-college.example/library",
    department: "library",
    audience: "public",
    tags: ["library", "books", "study", "research", "databases"],
    content: `The Library provides study spaces, research databases, and course reserves. Sample hours: Monday–Thursday, 8:00 AM–7:00 PM, and Friday, 8:00 AM–2:00 PM. ${MOCK_DATA_DISCLAIMER}`,
    lastReviewed: "2025-07-01",
  },
  {
    id: "src_tutoring",
    title: "Tutoring Center — Free Academic Support (Sample)",
    uri: "https://demo.lemoore-college.example/tutoring",
    department: "tutoring_center",
    audience: "public",
    tags: ["tutoring", "tutor", "academic support", "writing", "math help"],
    content: `The Tutoring Center offers free drop-in and appointment-based tutoring in many subjects, including writing and math. Sample guidance: bring your assignment and textbook to a session. ${MOCK_DATA_DISCLAIMER}`,
    lastReviewed: "2025-07-01",
  },
  {
    id: "src_bookstore",
    title: "Campus Bookstore — Textbooks & Supplies (Sample)",
    uri: "https://demo.lemoore-college.example/bookstore",
    department: "bookstore",
    audience: "public",
    tags: ["bookstore", "textbooks", "books", "supplies", "rental"],
    content: `The Campus Bookstore sells and rents textbooks and course materials. Sample guidance: look up required materials by course number, and keep your receipt for the return period. ${MOCK_DATA_DISCLAIMER}`,
    lastReviewed: "2025-07-01",
  },

  // --- Technology: Canvas, Student Email, IT ----------------------------------------
  {
    id: "src_canvas",
    title: "Canvas — Online Course Access (Sample)",
    uri: "https://demo.lemoore-college.example/it-help/canvas",
    department: "it_help_desk",
    audience: "public",
    tags: ["canvas", "online classes", "lms", "login", "courses"],
    content: `Canvas is the learning management system where students access online and hybrid courses, assignments, and grades. Sample guidance: sign in with your student account; courses appear on or shortly before the start date. ${MOCK_DATA_DISCLAIMER}`,
    lastReviewed: "2025-07-01",
  },
  {
    id: "src_student_email",
    title: "Student Email — Setup & Access (Sample)",
    uri: "https://demo.lemoore-college.example/it-help/student-email",
    department: "it_help_desk",
    audience: "public",
    tags: ["student email", "email", "account", "login", "password"],
    content: `Every enrolled student receives a college email account used for official communication. Sample guidance: activate your account through the student portal, and contact the IT Help Desk if you cannot sign in. ${MOCK_DATA_DISCLAIMER}`,
    lastReviewed: "2025-07-01",
  },

  // --- Campus Safety & Parking ------------------------------------------------------
  {
    id: "src_parking",
    title: "Parking & Permits — Overview (Sample)",
    uri: "https://demo.lemoore-college.example/safety/parking",
    department: "campus_safety",
    audience: "public",
    tags: ["parking", "permit", "campus safety", "lots", "vehicle"],
    content: `Students park in designated campus lots and may need a valid parking permit during posted hours. Sample guidance: purchase a permit through the student portal and display it as instructed. ${MOCK_DATA_DISCLAIMER}`,
    lastReviewed: "2025-07-01",
  },

  // --- Specialized student support programs -----------------------------------------
  {
    id: "src_veterans_services",
    title: "Veterans Services — Overview (Sample)",
    uri: "https://demo.lemoore-college.example/veterans",
    department: "veterans_services",
    audience: "public",
    tags: ["veterans", "va benefits", "military", "gi bill", "services"],
    content: `Veterans Services supports student veterans and dependents with education benefits and enrollment certification. Sample guidance: bring your certificate of eligibility to get started with benefit processing. ${MOCK_DATA_DISCLAIMER}`,
    lastReviewed: "2025-07-01",
  },
  {
    id: "src_dsps",
    title: "DSPS — Disability Support Services (Sample)",
    uri: "https://demo.lemoore-college.example/dsps",
    department: "dsps",
    audience: "public",
    tags: ["dsps", "disability", "accommodations", "accessibility", "support"],
    content: `Disabled Students Programs & Services (DSPS) arranges academic accommodations and support for students with disabilities. Sample guidance: schedule an intake appointment and provide documentation to determine accommodations. ${MOCK_DATA_DISCLAIMER}`,
    lastReviewed: "2025-07-01",
  },
  {
    id: "src_eops",
    title: "EOPS — Extended Opportunity Programs (Sample)",
    uri: "https://demo.lemoore-college.example/eops",
    department: "eops",
    audience: "public",
    tags: ["eops", "financial", "support", "counseling", "eligibility"],
    content: `Extended Opportunity Programs & Services (EOPS) offers extra counseling and support for eligible students facing educational or financial barriers. Sample guidance: apply early each term, as space is limited. ${MOCK_DATA_DISCLAIMER}`,
    lastReviewed: "2025-07-01",
  },
  {
    id: "src_calworks",
    title: "CalWORKs — Student Program (Sample)",
    uri: "https://demo.lemoore-college.example/calworks",
    department: "calworks",
    audience: "public",
    tags: ["calworks", "childcare", "work study", "support", "eligibility"],
    content: `The CalWORKs program supports students receiving public assistance with services such as work study, childcare referrals, and counseling. Sample guidance: contact the CalWORKs office to confirm eligibility. ${MOCK_DATA_DISCLAIMER}`,
    lastReviewed: "2025-07-01",
  },

  // --- Adult learners & general student services ------------------------------------
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
    id: "src_office_contacts",
    title: "Student Services — Office Contacts & Hours (Sample)",
    uri: "https://demo.lemoore-college.example/student-services/contacts",
    department: "student_services",
    audience: "public",
    tags: ["contact", "office hours", "hours", "student services", "help desk"],
    content: `Student Services can direct you to the right office for general questions. Sample hours: Monday–Friday, 8:00 AM–5:00 PM. ${MOCK_DATA_DISCLAIMER}`,
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
