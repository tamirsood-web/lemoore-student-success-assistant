// Search-side privacy screen (server-only, deterministic).
//
// This blocks a user from SHARING sensitive personal identifiers in a search/chat box — it
// does NOT block topical questions that merely mention words like "password" or "student
// id" (e.g. "I forgot my portal password" is a legitimate, answerable question). It only
// trips on patterns that look like an actual identifier value being pasted in, and it never
// echoes the detected value back (AGENTS.md §11). This preserves privacy without breaking
// the natural-language questions the demo must answer.

/** Result of screening a query for shared sensitive identifiers. */
export type PrivacyVerdict =
  | { readonly sensitive: false }
  | { readonly sensitive: true; readonly message: string };

const SSN_VALUE = /\b\d{3}-\d{2}-\d{4}\b/;
const LONG_DIGIT_RUN = /\b\d{9,16}\b/; // student id / card / account / bank numbers
const CARD_KEYWORDS =
  /\b(routing number|account number|credit card|debit card|card number|cvv|iban)\b/i;
const SHARED_SSN_PHRASE =
  /\b(my|the)\s+(social security( number)?|ssn)\b.*\d/i;

const PRIVACY_MESSAGE =
  "For your privacy, please don't enter personal or account details such as Social " +
  "Security numbers, ID numbers, or banking information here. For help with anything " +
  "account-specific, contact the relevant Lemoore College office through an official channel.";

/** Screen a query for apparent SHARED sensitive identifiers (values, not topics). */
export function screenForSharedIdentifiers(query: string): PrivacyVerdict {
  if (
    SSN_VALUE.test(query) ||
    LONG_DIGIT_RUN.test(query) ||
    CARD_KEYWORDS.test(query) ||
    SHARED_SSN_PHRASE.test(query)
  ) {
    return { sensitive: true, message: PRIVACY_MESSAGE };
  }
  return { sensitive: false };
}
