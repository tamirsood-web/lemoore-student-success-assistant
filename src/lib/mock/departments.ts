// Department contact directory (LOCAL DEMO DATA).
//
// These are the escalation destinations the assistant points students to when it cannot
// verify an answer. The department *names* and category coverage are derived from the
// repository docs (docs/ARCHITECTURE.md → Knowledge Sources; docs/EVAL_QUESTIONS.md).
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
  | "student_services";

/** All department ids, in a stable order (useful for iteration and tests). */
export const DEPARTMENT_IDS = [
  "admissions_records",
  "financial_aid",
  "counseling",
  "adult_learner_services",
  "student_services",
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
};

/** Return the contact record for a department id. */
export function getDepartment(id: DepartmentId): DepartmentContact {
  return departments[id];
}

/** Narrowing guard: is an arbitrary string a known department id? */
export function isDepartmentId(value: string): value is DepartmentId {
  return (DEPARTMENT_IDS as readonly string[]).includes(value);
}
