// Course census/drop-date dataset (LOCAL DEMO DATA).
//
// The FIELD SET (term, subject, catalog number, section, start/census/drop dates, source
// metadata) is derived from docs/ARCHITECTURE.md → Course-Date Handling. The VALUES are
// invented demo data — no real Lemoore College course dates are provided by the repo.
//
// All dates use unambiguous ISO 8601 (YYYY-MM-DD). Every record references the sample
// course-date source by title, so a citation always maps to a real source record. Exact
// identifiers (term + subject + catalog number + section) are required for a match — this
// dataset deliberately does not support generic-calendar answering (requirements.md Req 4).

import type { CourseDate } from "@/types";
import { COURSE_DATE_SOURCE_TITLE } from "./sources";

/** Sample course-date records (local demo data; not official deadlines). */
export const courseDates: readonly CourseDate[] = [
  {
    term: "Fall 2025",
    subject: "MATH",
    catalogNumber: "101",
    section: "01",
    startDate: "2025-08-18",
    censusDate: "2025-09-02",
    dropDate: "2025-11-14",
    sourceTitle: COURSE_DATE_SOURCE_TITLE,
  },
  {
    term: "Fall 2025",
    subject: "ENGL",
    catalogNumber: "100",
    section: "02",
    startDate: "2025-08-18",
    censusDate: "2025-09-02",
    dropDate: "2025-11-14",
    sourceTitle: COURSE_DATE_SOURCE_TITLE,
  },
  {
    term: "Fall 2025",
    subject: "BIOL",
    catalogNumber: "110",
    section: "01",
    startDate: "2025-08-19",
    censusDate: "2025-09-03",
    dropDate: "2025-11-15",
    sourceTitle: COURSE_DATE_SOURCE_TITLE,
  },
  {
    term: "Spring 2026",
    subject: "MATH",
    catalogNumber: "101",
    section: "01",
    startDate: "2026-01-12",
    censusDate: "2026-01-27",
    dropDate: "2026-04-10",
    sourceTitle: COURSE_DATE_SOURCE_TITLE,
  },
];
