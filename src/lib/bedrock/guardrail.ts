// Mock guardrail: sensitive-data screening (server-only, deterministic).
//
// Detects apparent sensitive identifiers in a query and returns a rejection verdict that
// NEVER echoes the detected value (AGENTS.md §11; requirements.md Req 6). Prompt-injection
// text is not special-cased here — it simply won't match any sensitive pattern, so it is
// treated as ordinary data and passes through (Req 7). This is a local stand-in for
// Bedrock Guardrails; it makes no network/AWS calls.

import type { GuardrailScreenFn, GuardrailVerdict, SensitiveCategory } from "@/types";
import { departments, type DepartmentId } from "@/lib/mock";

type Rule = {
  readonly category: SensitiveCategory;
  readonly department: DepartmentId;
  readonly test: (query: string) => boolean;
};

// Evaluated in order; the first matching rule wins (deterministic).
const RULES: readonly Rule[] = [
  {
    category: "ssn",
    department: "financial_aid",
    test: (q) =>
      /\b\d{3}-\d{2}-\d{4}\b/.test(q) ||
      /\bssn\b/i.test(q) ||
      /social security/i.test(q),
  },
  {
    category: "date_of_birth",
    department: "admissions_records",
    test: (q) =>
      /\bdate of birth\b/i.test(q) ||
      /\bdob\b/i.test(q) ||
      /\bbirth ?date\b/i.test(q) ||
      /\bborn on\b/i.test(q),
  },
  {
    category: "banking",
    department: "financial_aid",
    test: (q) =>
      /\b(bank account|routing number|account number|credit card|debit card|card number|cvv|iban)\b/i.test(
        q,
      ) || /\b\d{13,16}\b/.test(q),
  },
  {
    category: "student_id",
    department: "admissions_records",
    test: (q) =>
      /\bstudent (id|number|i\.d\.)\b/i.test(q) || /\b\d{7,10}\b/.test(q),
  },
  {
    category: "password",
    department: "student_services",
    test: (q) => /\b(password|passcode|my pin)\b/i.test(q),
  },
];

function safeMessageFor(departmentName: string): string {
  return `For your privacy, please don't share personal or account details such as ID numbers, dates of birth, passwords, or banking information here. To get help with this securely, contact ${departmentName} through an official channel.`;
}

/** Screen a query for sensitive data. Returns a rejection verdict on the first match. */
export const screen: GuardrailScreenFn = (query): GuardrailVerdict => {
  for (const rule of RULES) {
    if (rule.test(query)) {
      const departmentName = departments[rule.department].name;
      return {
        ok: false,
        reason: "sensitive",
        category: rule.category,
        safeMessage: safeMessageFor(departmentName),
        department: departmentName,
      };
    }
  }
  return { ok: true };
};
