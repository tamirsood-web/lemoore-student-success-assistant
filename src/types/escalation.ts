// Escalation domain types.
//
// Deterministic escalation is a permanent, framework-independent concern (AGENTS.md §10).
// These types describe *why* the assistant escalates and *where* it points the student.
// The escalation rules that produce these values are implemented later (tasks Group 5);
// this module only defines the shapes they must satisfy.

/**
 * The deterministic reasons the assistant escalates instead of answering, mirroring the
 * bullet list in AGENTS.md §10. Represented as an explicit union so the server and UI
 * never interpret free-form text.
 */
export type EscalationReason =
  | "no_relevant_source"
  | "missing_citations"
  | "private_or_student_specific"
  | "binding_policy_interpretation"
  | "conflicting_sources"
  | "unresolved_course_date"
  | "safety_or_emergency"
  | "high_stakes_insufficient_evidence";

/**
 * Official contact details for a responsible department. Populated from local mock data
 * in a later task group; no real contact data lives in this type module.
 */
export type DepartmentContact = {
  readonly name: string;
  readonly email?: string;
  readonly phone?: string;
  readonly url?: string;
  /** Physical office location note (building / room). Demo data only. */
  readonly office?: string;
  /** Building name or number. Demo data only. */
  readonly building?: string;
  /** Sample office hours text. Demo data only. */
  readonly hours?: string;
  /** Link to the campus map page for this department. Demo data only. */
  readonly mapUrl?: string;
};

/**
 * Transparent escalation guidance attached to an insufficient-evidence response. The
 * `message` uses the non-vague fallback wording pattern from AGENTS.md §10 and never
 * claims a human has actually been contacted.
 */
export type EscalationGuidance = {
  readonly reason: EscalationReason;
  readonly department: string;
  readonly contact: DepartmentContact;
  readonly message: string;
};
