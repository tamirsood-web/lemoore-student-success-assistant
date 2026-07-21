// Framework-independent, server-safe parsing helpers.
//
// Wraps Zod's `safeParse` in a structured result shape so callers (route handlers, the
// env loader, tests) get a discriminated result instead of throwing, plus a single
// user-safe message. Error text here is surfaced to students, so it must never leak
// internal detail, stack traces, or the offending value.

import type { z } from "zod";

/** A single field-level validation problem. `path` names the field, never a value. */
export type ValidationIssue = {
  readonly path: string;
  readonly message: string;
};

export type ValidationSuccess<T> = {
  readonly success: true;
  readonly data: T;
};

export type ValidationFailure = {
  readonly success: false;
  /** One short, user-safe sentence suitable for direct display. */
  readonly message: string;
  readonly issues: readonly ValidationIssue[];
};

export type ValidationResult<T> = ValidationSuccess<T> | ValidationFailure;

/** Generic message used when more than one field failed, to avoid leaking specifics. */
const MULTIPLE_ISSUES_MESSAGE =
  "Some of the information provided is not valid. Please review your input and try again.";

const FALLBACK_MESSAGE = "The information provided is not valid. Please try again.";

/**
 * Validate `input` against `schema`, returning a structured result. On failure, produces
 * a single user-safe `message`: the field's own message when exactly one field failed,
 * otherwise a generic sentence.
 */
export function safeParse<TSchema extends z.ZodTypeAny>(
  schema: TSchema,
  input: unknown,
): ValidationResult<z.infer<TSchema>> {
  const parsed = schema.safeParse(input);
  if (parsed.success) {
    return { success: true, data: parsed.data };
  }

  const issues: ValidationIssue[] = parsed.error.issues.map((issue) => ({
    path: issue.path.length > 0 ? issue.path.join(".") : "(root)",
    message: issue.message,
  }));

  const firstIssue = issues[0];
  const message =
    issues.length === 1 && firstIssue
      ? firstIssue.message
      : issues.length > 1
        ? MULTIPLE_ISSUES_MESSAGE
        : FALLBACK_MESSAGE;

  return { success: false, message, issues };
}
