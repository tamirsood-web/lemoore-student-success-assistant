// Local mock guardrail — screens queries for sensitive identifiers.
// In the AWS phase this is replaced by Bedrock Guardrails.

import type { GuardrailVerdict } from "@/types";

type SensitivePattern = {
  pattern: RegExp;
  message: string;
  department: string;
};

const PATTERNS: readonly SensitivePattern[] = [
  {
    pattern: /\b\d{3}[- ]?\d{2}[- ]?\d{4}\b/,
    message:
      "Your message appears to contain a Social Security Number. " +
      "Please do not share it here — contact Admissions & Records using a secure channel.",
    department: "Admissions & Records",
  },
  {
    pattern: /\b(?:student\s*id|sid)[:\s#]*\d{5,10}\b/i,
    message:
      "Your message appears to include a student ID. " +
      "Please do not share it here — contact Admissions & Records directly.",
    department: "Admissions & Records",
  },
  {
    pattern:
      /\b(?:dob|date of birth|born|birthday)[:\s]*\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/i,
    message:
      "Your message appears to contain a date of birth. " +
      "Please do not share personal details in this chat.",
    department: "Student Services",
  },
  {
    pattern: /\bpassword\s*[:=\s]\s*\S+/i,
    message:
      "Please do not share passwords here. " +
      "If you need help with account access, contact Student Services.",
    department: "Student Services",
  },
  {
    pattern: /\b(?:account|routing|bank)\s*(?:number|#|no)[:\s]*\d{6,}/i,
    message:
      "Your message appears to contain financial account details. " +
      "Please contact Financial Aid using a secure channel.",
    department: "Financial Aid",
  },
];

export function screen(query: string): GuardrailVerdict {
  for (const { pattern, message, department } of PATTERNS) {
    if (pattern.test(query)) {
      return { ok: false, reason: "sensitive", safeMessage: message, department };
    }
  }
  return { ok: true };
}
