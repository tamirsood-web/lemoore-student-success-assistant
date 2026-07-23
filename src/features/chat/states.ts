// Explicit, strictly-typed chat state for the client container.
//
// `ChatState` is the request-lifecycle discriminated union; `Turn` holds each student
// question with its per-turn state so the question stays visible whether the request is
// pending, answered, or failed.

import type { AssistantResponse } from "@/types";
import type { FallbackScenario } from "@/lib/fallback-messages";

/** Per-turn lifecycle: pending → answered | fallback | failed. */
export type TurnState =
  | { readonly kind: "pending" }
  | { readonly kind: "answered"; readonly response: AssistantResponse }
  | { readonly kind: "fallback"; readonly scenario: FallbackScenario }
  | { readonly kind: "failed"; readonly scenario: FallbackScenario };

/** A single conversation turn: the student's question plus its current state. */
export type Turn = {
  readonly id: string;
  readonly question: string;
  readonly state: TurnState;
};

/** Request-lifecycle state for the whole chat surface. */
export type ChatState =
  | { readonly status: "idle" }
  | { readonly status: "submitting" }
  | { readonly status: "ready" }
  | { readonly status: "validation"; readonly message: string }
  | { readonly status: "error" };
