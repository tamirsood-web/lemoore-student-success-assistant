// Department contact directory (LOCAL DEMO DATA).
//
// These are the escalation destinations the assistant points students to when it cannot
// verify an answer, and the offices that own the topics in the demo knowledge base.
// The department *names* and category coverage are derived from the repository docs
// (docs/ARCHITECTURE.md → Knowledge Sources; docs/EVAL_QUESTIONS.md) and the demo brief.
//
// The contact details (email, phone, URL, office/hours) are NOT real. They use reserved
// fictional patterns on purpose — the `.example` TLD and `(000) 555-01xx` numbers — so it
// is obvious this is sample data for local development, never official Lemoore College
// contact information. Replace this file with an approved directory in a later phase.

import type { DepartmentContact } from "@/types";

/** Stable identifiers for the supported escalation destinations. */
export type DepartmentId =
  | "admissions_records"
  | "financial_aid"
  | "counseling"
  | "adult_learner_services"
  | "student_services"
  | "transfer_center"
  | "career_center"
  | "library"
  | "tutoring_center"
  | "bookstore"
  | "campus_safety"
  | "it_help_desk"
  | "veterans_services"
  | "dsps"
  | "eops"
  | "calworks";

/** All department ids, in a stable order (useful for iteration and tests). */
export const DEPARTMENT_IDS = [
  "admissions_records",
  "financial_aid",
  "counseling",
  "adult_learner_services",
  "student_services",
  "transfer_center",
  "career_center",
  "library",
  "tutoring_center",
  "bookstore",
  "campus_safety",
  "it_help_desk",
  "veterans_services",
  "dsps",
  "eops",
  "calworks",
] as const satisfies readonly DepartmentId[];

const OFFICE_NOTE = "Sample office and hours — demo data only.";

/** Department contacts keyed by {@link DepartmentId}. All contact details are demo data. */
export const departments: Readonly<Record<DepartmentId, DepartmentContact>> = {
  admissions_records: {
    name: "Admissions & Records",
    email: "admissions@demo.lemoore-college.example",
    phone: "(000) 555-0100",
    url: "https://demo.lemoore-college.example/admissions",
    office: OFFICE_NOTE,
  },
  financial_aid: {
    name: "Financial Aid",
    email: "financialaid@demo.lemoore-college.example",
    phone: "(000) 555-0110",
    url: "https://demo.lemoore-college.example/financial-aid",
    office: OFFICE_NOTE,
  },
  counseling: {
    name: "Counseling",
    email: "counseling@demo.lemoore-college.example",
    phone: "(000) 555-0120",
    url: "https://demo.lemoore-college.example/counseling",
    office: OFFICE_NOTE,
  },
  adult_learner_services: {
    name: "Adult Learner Services",
    email: "adultlearners@demo.lemoore-college.example",
    phone: "(000) 555-0130",
    url: "https://demo.lemoore-college.example/adult-learners",
    office: OFFICE_NOTE,
  },
  student_services: {
    name: "Student Services",
    email: "studentservices@demo.lemoore-college.example",
    phone: "(000) 555-0140",
    url: "https://demo.lemoore-college.example/student-services",
    office: OFFICE_NOTE,
  },
  transfer_center: {
    name: "Transfer Center",
    email: "transfer@demo.lemoore-college.example",
    phone: "(000) 555-0150",
    url: "https://demo.lemoore-college.example/transfer",
    office: OFFICE_NOTE,
  },
  career_center: {
    name: "Career Center",
    email: "careers@demo.lemoore-college.example",
    phone: "(000) 555-0160",
    url: "https://demo.lemoore-college.example/career",
    office: OFFICE_NOTE,
  },
  library: {
    name: "Library",
    email: "library@demo.lemoore-college.example",
    phone: "(000) 555-0170",
    url: "https://demo.lemoore-college.example/library",
    office: OFFICE_NOTE,
  },
  tutoring_center: {
    name: "Tutoring Center",
    email: "tutoring@demo.lemoore-college.example",
    phone: "(000) 555-0180",
    url: "https://demo.lemoore-college.example/tutoring",
    office: OFFICE_NOTE,
  },
  bookstore: {
    name: "Campus Bookstore",
    email: "bookstore@demo.lemoore-college.example",
    phone: "(000) 555-0190",
    url: "https://demo.lemoore-college.example/bookstore",
    office: OFFICE_NOTE,
  },
  campus_safety: {
    name: "Campus Safety & Parking",
    email: "safety@demo.lemoore-college.example",
    phone: "(000) 555-0101",
    url: "https://demo.lemoore-college.example/safety",
    office: OFFICE_NOTE,
  },
  it_help_desk: {
    name: "IT Help Desk",
    email: "helpdesk@demo.lemoore-college.example",
    phone: "(000) 555-0102",
    url: "https://demo.lemoore-college.example/it-help",
    office: OFFICE_NOTE,
  },
  veterans_services: {
    name: "Veterans Services",
    email: "veterans@demo.lemoore-college.example",
    phone: "(000) 555-0103",
    url: "https://demo.lemoore-college.example/veterans",
    office: OFFICE_NOTE,
  },
  dsps: {
    name: "Disabled Students Programs & Services (DSPS)",
    email: "dsps@demo.lemoore-college.example",
    phone: "(000) 555-0104",
    url: "https://demo.lemoore-college.example/dsps",
    office: OFFICE_NOTE,
  },
  eops: {
    name: "Extended Opportunity Programs & Services (EOPS)",
    email: "eops@demo.lemoore-college.example",
    phone: "(000) 555-0105",
    url: "https://demo.lemoore-college.example/eops",
    office: OFFICE_NOTE,
  },
  calworks: {
    name: "CalWORKs",
    email: "calworks@demo.lemoore-college.example",
    phone: "(000) 555-0106",
    url: "https://demo.lemoore-college.example/calworks",
    office: OFFICE_NOTE,
  },
};

/** Return the contact record for a department id. */
export function getDepartment(id: DepartmentId): DepartmentContact {
  return departments[id];
}

/** Narrowing guard: is an arbitrary string a known department id? */
export function isDepartmentId(value: string): value is DepartmentId {
  return (DEPARTMENT_IDS as readonly string[]).includes(value);
}
