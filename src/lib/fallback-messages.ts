// Centralized fallback and error messages for the Student Assistant.
//
// All contact details and message templates live here so they can be reused across
// components and request handlers without duplication. Each scenario maps to a unique
// identifier used by the ChatContainer and MessageList to select the correct message.

/** Lemoore College shared contact information. */
export const CONTACT = {
  email: "lemoorehelpdesk@whccd.edu",
  phone: "(559) 925-3000",
  phoneTel: "+15599253000",
  hours: "Monday\u2013Friday, 8:00 a.m.\u20135:00 p.m.",
  location: "555 College Avenue, Building 100",
} as const;

/**
 * Identifies the reason the assistant could not produce a normal grounded answer.
 * Used by the UI to select the correct fallback template.
 */
export type FallbackScenario =
  | "noReliableAnswer"
  | "noSearchResults"
  | "needsMoreInformation"
  | "outOfScope"
  | "technicalError";

/** A structured fallback message ready for rendering. */
export interface FallbackMessage {
  readonly scenario: FallbackScenario;
  readonly heading: string;
  readonly guidance: string;
}

/**
 * Message templates keyed by scenario. Each entry has a `heading` (the first line) and
 * `guidance` (additional direction before the contact block).
 */
export const FALLBACK_MESSAGES: Record<FallbackScenario, Omit<FallbackMessage, "scenario">> = {
  noReliableAnswer: {
    heading:
      "I couldn\u2019t find a reliable answer to your question in Lemoore College\u2019s official resources.",
    guidance:
      "Please try rephrasing your question or contact Lemoore College for assistance:",
  },
  noSearchResults: {
    heading:
      "I couldn\u2019t find any official information that matches your question.",
    guidance:
      "Try using different keywords or asking your question another way. You can also contact Lemoore College for assistance:",
  },
  needsMoreInformation: {
    heading: "I need a little more information to help with your question.",
    guidance:
      "Please try adding more details or rephrasing your question. If you still need help, contact Lemoore College:",
  },
  outOfScope: {
    heading:
      "I\u2019m designed to answer questions about Lemoore College and its official resources.",
    guidance: "For additional assistance, please contact:",
  },
  technicalError: {
    heading: "Sorry, something went wrong while processing your request.",
    guidance:
      "Please try again in a moment. If the problem continues, contact Lemoore College:",
  },
} as const;

/** Build a complete FallbackMessage for a given scenario. */
export function getFallbackMessage(scenario: FallbackScenario): FallbackMessage {
  return { scenario, ...FALLBACK_MESSAGES[scenario] };
}
