// Explicit, strictly-typed chat state for the client container.
//
// `ChatState` is the request-lifecycle discriminated union; `Turn` holds each student
// question with its per-turn state so the question stays visible whether the request is
// pending, answered, or failed.

import type { AssistantResponse } from "@/types";

/** Per-turn lifecycle: pending → answered | failed. */
export type TurnState =
  | { readonly kind: "pending" }
  | { readonly kind: "answered"; readonly response: AssistantResponse }
  | { readonly kind: "failed"; readonly message: string };

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
  | { readonly status: "error"; readonly message: string };
