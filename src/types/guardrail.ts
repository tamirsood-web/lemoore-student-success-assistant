// Guardrail (sensitive-data screening) seam types.
//
// The local mock guardrail and the future Bedrock Guardrails integration both satisfy
// these shapes. The screening implementation is defined later (tasks Group 5); this
// module only defines the verdict contract (design.md → Components and Interfaces).

/**
 * Categories of sensitive information the public assistant must never request, echo, or
 * process, drawn from AGENTS.md §11. Used to describe *why* a submission was rejected
 * without ever repeating the detected value.
 */
export type SensitiveCategory =
  | "ssn"
  | "student_id"
  | "date_of_birth"
  | "password"
  | "banking"
  | "grades"
  | "financial_detail";

/**
 * Result of screening a query. `ok: true` lets the request proceed. `ok: false` is a
 * sensitive-data rejection carrying a privacy-safe message and the department to contact
 * via an official secure channel — the detected value is never included.
 */
export type GuardrailVerdict =
  | { readonly ok: true }
  | {
      readonly ok: false;
      readonly reason: "sensitive";
      /** Which sensitive category was detected; lets the response label the rejection. */
      readonly category: SensitiveCategory;
      readonly safeMessage: string;
      readonly department: string;
    };
