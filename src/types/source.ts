// Approved-source and course-date domain types.
//
// These are the design's `MockSource` / `MockCourseDate` shapes (design.md → Data Models),
// centralized here as permanent, framework-independent domain types: the *data* served in
// the local MVP is mock, but the *types* carry forward unchanged into the AWS phase. The
// mock data itself is defined later (tasks Group 4) and typed with these.

/** Audience an approved source is cleared for. Public-only in this phase. */
export type SourceAudience = "public";

/**
 * A single approved knowledge source. `content` is the only text the assistant may use to
 * compose a grounded answer, and it is surfaced to students as a citation excerpt. `tags`
 * drive local retrieval matching. `id` is the stable identifier a `Citation.sourceId`
 * must reference.
 */
export type Source = {
  readonly id: string;
  readonly title: string;
  readonly uri?: string;
  readonly department: string;
  readonly audience: SourceAudience;
  readonly tags: readonly string[];
  readonly content: string;
  /** ISO date the source was last reviewed; shown as a freshness signal. */
  readonly lastReviewed: string;
};

/**
 * A single course/section census-and-drop-date record. The identifier fields
 * (term/subject/catalogNumber/section) support exact-match lookups only — generic
 * calendar answering is intentionally impossible (requirements.md Req 4).
 */
export type CourseDate = {
  readonly term: string;
  readonly subject: string;
  readonly catalogNumber: string;
  readonly section: string;
  readonly startDate: string;
  readonly censusDate: string;
  readonly dropDate: string;
  readonly sourceTitle: string;
};
