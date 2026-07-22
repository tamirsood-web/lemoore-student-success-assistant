// Barrel for the server-side seam implementations (mock now, AWS later).
// Import from "@/lib/bedrock".

export { retrieve, COURSE_DATE_SOURCE_ID } from "./retrieve";
export { screen } from "./guardrail";
export { composeAnswer, ANSWER_SEPARATOR } from "./prompt";
export { applyEscalationRules, escalationMessage } from "./escalation";
export { toAssistantResponse } from "./normalize";
