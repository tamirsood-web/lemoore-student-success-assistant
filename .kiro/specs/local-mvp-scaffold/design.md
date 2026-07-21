# Design — Local MVP Scaffold

## Overview

This design delivers the **Public Student Mode grounded-chat vertical slice** as a
fully local, mock-backed Next.js application. It is the first slice of the Lemoore
Student Success Assistant and is intentionally the smallest complete path that a judge
or teammate can run with `npm install && npm run dev` and no AWS account.

The guiding constraint is **swap-not-rewrite**: every place the production system will
call AWS is represented in this phase by a local mock that lives behind the exact
server-side function signature and typed contract the real integration will implement.
The UI, the route handlers, the validation layer, the escalation rules, and the
`AssistantResponse` contract are all "real" and permanent. Only the retrieval, guardrail,
and persistence *implementations* are mock, and each is isolated behind a single module
boundary so a later spec can replace it without touching the UI or the API contract.

### Design goals

1. Run entirely locally — no Bedrock, DynamoDB, Cognito, or paid API (Req 9).
2. Keep the grounded-answer, citation, escalation, and safety behavior *real* even
   though the data is mock, so the demo is honest about what the product does (Req 3–7).
3. Match the repository's mandated structure and stack exactly (`AGENTS.md` §5, §7,
   `.kiro/steering/tech.md`, `structure.md`) so later slices extend rather than refactor.
4. Enforce the server/client boundary and secrets hygiene from the first commit
   (`AGENTS.md` §8, §11).

### Explicit non-goals for this slice

Ambassador/admin modes, Cognito, real DynamoDB persistence, real KB ingestion, and any
deployment are **out of scope** and are represented only by directory placement and
interface seams, not implementations.

---

## Architecture

### Local runtime (this phase)

```text
Browser (mobile-first public UI)
  |
  v
Next.js App Router  (single deployable app, runs via `npm run dev`)
  |
  +--> (public) student chat page          [client component for interactivity]
  |
  +--> Route handlers (server-only)
          |
          +--> POST /api/chat
          |       1. Zod-validate request body
          |       2. Sensitive-identifier detection / rejection      (mock guardrail)
          |       3. Prompt-injection-resilient handling             (untrusted input)
          |       4. mock retrieve-and-generate                      (mock KB)
          |       5. deterministic escalation rules                  (real rules)
          |       6. normalize -> AssistantResponse                  (real contract)
          |       7. redacted console log only                       (no raw prompt)
          |
          +--> POST /api/feedback   (accepts + validates; in-memory/no-op sink)
          |
          +--> GET  /api/health     (200 status, no deps)
```

The dashed AWS boundaries from `docs/ARCHITECTURE.md` are preserved as **seams**:

| Production (later spec) | This phase (local mock) | Seam module |
|---|---|---|
| Bedrock KB retrieve-and-generate | In-memory keyword/tag match over mock sources | `src/lib/bedrock/retrieve.ts` |
| Bedrock Guardrails | Regex/rule sensitive-data + injection screen | `src/lib/bedrock/guardrail.ts` |
| DynamoDB writes | In-memory/no-op sink returning success | `src/lib/db/*.ts` |
| Cognito auth | Not wired; routes remain public | `src/lib/auth/*` (stub, unused) |

The key architectural property: **the route handler imports only the seam module's
interface.** It has no knowledge of whether the answer came from a mock or from Bedrock.

### Swap path (future, documented not built)

A later spec replaces the body of `retrieve.ts` and `guardrail.ts` with Bedrock SDK
calls and points `db/*` at DynamoDB. Because the exported function signatures and the
`AssistantResponse` normalization are fixed here, that change is contained to
`src/lib/bedrock` and `src/lib/db`.

---

## Components and Interfaces

The design is organized around a few stable interfaces. UI and route handlers depend on
these signatures, never on their implementations, so the later AWS swap is contained.

### Seam interfaces (server-only) — permanent signatures, mock bodies this phase

```ts
// src/lib/bedrock/retrieve.ts
// Mock body now; Bedrock KB retrieve-and-generate later. Signature is fixed.
export type RetrievedSnippet = {
  source: MockSource | MockCourseDate;
  title: string;
  uri?: string;
  excerpt: string;
};
export type RetrievalResult = {
  intent: "source" | "course-date";
  snippets: RetrievedSnippet[];   // empty => no support => escalation
  needsIdentifiers?: boolean;     // course-date asked without enough identifiers
};
export function retrieve(query: string): Promise<RetrievalResult>;

// src/lib/bedrock/guardrail.ts
// Mock body now; Bedrock Guardrails later. Signature is fixed.
export type GuardrailVerdict =
  | { ok: true }
  | { ok: false; reason: "sensitive"; safeMessage: string; department: string };
export function screen(query: string): GuardrailVerdict;

// src/lib/bedrock/escalation.ts  (real logic, carries forward unchanged)
export function applyEscalationRules(input: {
  result: RetrievalResult;
  composedAnswer: string | null;
}): { escalationRecommended: boolean; department?: string; confidence: Confidence };

// src/lib/bedrock/normalize.ts  (real logic)
export function toAssistantResponse(...): AssistantResponse;

// src/lib/db/feedback.ts  (no-op sink this phase; DynamoDB later. Signature fixed.)
export function recordFeedback(input: FeedbackInput): Promise<{ ok: true }>;
```

### Route handler contracts

| Route | Input (Zod) | Output | Auth |
|---|---|---|---|
| `POST /api/chat` | `ChatRequest` | `AssistantResponse` (200) / 400 / 500 | Public |
| `POST /api/feedback` | `FeedbackRequest` | `{ ok: true }` (200) / 400 | Public (no-op) |
| `GET /api/health` | — | `{ status: "ok" }` (200) | Public |

### UI component interfaces (feature layer)

- `ChatContainer` (client) — owns `ChatState`; calls `/api/chat`; orchestrates children.
- `ChatInput` — controlled input; enforces empty/whitespace/`CHAT_MAX_INPUT_CHARS`
  validation before submit; emits `onSubmit(message)`.
- `MessageList` / `MessageBubble` — render question/answer turns with confidence-safe
  lead-in.
- `CitationList` / `CitationCard` — render `Citation[]` in a separated area; link when
  `uri` present, plain title otherwise.
- `EscalationCard` — renders `department` + official contact + transparent wording when
  `escalationRecommended`.
- `FeedbackControls` — helpful/unhelpful → `POST /api/feedback`.
- `ExampleQuestions` / `EmptyState` — suggestion chips (empty state) and follow-ups.
- `components/ui/*` — hand-authored `Button`, `Card`, `Textarea`, `Spinner` primitives.

## Project structure

Follows `AGENTS.md` §7 and `.kiro/steering/structure.md` exactly. Files marked
**(this phase)** are implemented now; others are created as directories/placeholders only
where needed to establish the seam, and are **not** built out.

```text
src/
  app/
    (public)/
      page.tsx                     # (this phase) student chat page shell (server) + client chat
      layout.tsx                   # (this phase) root layout, fonts, metadata
    ambassador/                    # created empty; not implemented this phase
    admin/                         # created empty; not implemented this phase
    api/
      chat/route.ts                # (this phase) POST /api/chat
      feedback/route.ts            # (this phase) POST /api/feedback (validates; no-op sink)
      health/route.ts              # (this phase) GET /api/health
    globals.css                    # (this phase) Tailwind layers
  components/
    ui/                            # (this phase) small accessible primitives (button, card, textarea, spinner)
  features/
    chat/
      ChatContainer.tsx            # (this phase) client component: state machine + orchestration
      MessageList.tsx              # (this phase) renders turns
      MessageBubble.tsx            # (this phase) answer/question rendering
      ChatInput.tsx                # (this phase) validated input + submit
      ExampleQuestions.tsx         # (this phase) empty-state suggestions + follow-ups
      EmptyState.tsx               # (this phase) intro + trust framing
      states.ts                    # (this phase) UI state union type
    citations/
      CitationList.tsx             # (this phase) separated citation area
      CitationCard.tsx             # (this phase) title + optional link + excerpt
    escalation/
      EscalationCard.tsx           # (this phase) department + contact + transparent wording
    feedback/
      FeedbackControls.tsx         # (this phase) helpful/unhelpful UI -> /api/feedback
  lib/
    bedrock/
      retrieve.ts                  # (this phase) MOCK retrieve-and-generate behind real signature
      guardrail.ts                 # (this phase) MOCK sensitive-data + injection screen
      normalize.ts                 # (this phase) map raw -> AssistantResponse
      escalation.ts                # (this phase) deterministic escalation rules
      prompt.ts                    # (this phase) answer composition from retrieved snippets
    validation/
      schemas.ts                   # (this phase) Zod: chat request, feedback request
      env.ts                       # (this phase) Zod-validated env (AWS vars optional)
    mock/
      sources.ts                   # (this phase) approved-source mock snippets + metadata
      courseDates.ts               # (this phase) small mock course-date dataset
      departments.ts               # (this phase) department contacts for escalation
    db/
      feedback.ts                  # (this phase) no-op/in-memory feedback sink behind real signature
      analytics.ts                 # created; no-op this phase
    auth/                          # created empty; not implemented this phase
    utils/
      redact.ts                    # (this phase) redaction for logging
  types/
    assistant.ts                   # (this phase) AssistantResponse + related types
docs/                              # UNCHANGED — not touched
.kiro/                             # steering + this spec
.env.example                      # (this phase) placeholder names only, no secrets
```

No duplicate utilities are introduced; shared types live in `src/types`, shared Zod
schemas in `src/lib/validation`.

---

## Data Models

### AssistantResponse (permanent contract — `AGENTS.md` §9)

```ts
// src/types/assistant.ts
export type Confidence = "high" | "medium" | "low";

export type Citation = {
  title: string;
  uri?: string;
  excerpt?: string;
};

export type AssistantResponse = {
  answer: string;
  confidence: Confidence;
  citations: Citation[];
  department?: string;
  escalationRecommended: boolean;
  suggestedQuestions: string[];
};
```

The UI renders **confidence-safe language**, never the raw enum:
`high → "Based on official college sources"`, `medium → "Here is what the sources
indicate"`, `low → "I could not fully verify this"`. (Req 3.4)

### Request contracts (Zod — `src/lib/validation/schemas.ts`)

```ts
export const ChatRequest = z.object({
  message: z.string().trim().min(1).max(CHAT_MAX_INPUT_CHARS),
  // No client-supplied role/mode is trusted (AGENTS.md §11); mode is server-derived
  // and fixed to "public" in this phase.
});

export const FeedbackRequest = z.object({
  conversationId: z.string().min(1),
  helpful: z.boolean(),
  reason: z.string().max(500).optional(),
});
```

### Environment (Zod — `src/lib/validation/env.ts`)

AWS variables are declared but **optional** this phase so the app boots without them
(Req 9.4). `CHAT_MAX_INPUT_CHARS` defaults to a sane value (e.g. 500) if unset.

### Mock data shapes

```ts
// src/lib/mock/sources.ts
export type MockSource = {
  id: string;
  title: string;
  uri?: string;             // relative/anchor link or omitted
  department: string;
  audience: "public";
  tags: string[];           // used by mock retrieval matching
  content: string;          // snippet used as citation excerpt + answer basis
  lastReviewed: string;     // ISO date, shown as freshness signal
};

// src/lib/mock/courseDates.ts — preserves exact-match fields (ARCHITECTURE §Course-Date)
export type MockCourseDate = {
  term: string;
  subject: string;
  catalogNumber: string;
  section: string;
  startDate: string;
  censusDate: string;
  dropDate: string;
  sourceTitle: string;
};
```

Content is drawn from the categories in `docs/ARCHITECTURE.md` (admissions/records,
financial aid FAQ, counseling/registration, academic calendar, transcript/degree
posting, office hours/contacts, adult-learner services) and questions in
`docs/EVAL_QUESTIONS.md`, and is explicitly labeled as **mock/sample** content.

---

## Server flow — POST /api/chat

Mirrors the "Core Server Flow" of `docs/ARCHITECTURE.md`, with mock stand-ins for the
Bedrock steps. All logic is server-only.

```text
1. Parse + Zod-validate body                        -> 400 on failure (Req 8.5)
2. guardrail.screen(message):
     - sensitive identifiers (SSN / studentId / DOB / password / bank)?
         -> return SENSITIVE_REJECTION response (no echo)         (Req 6)
     - injection markers are NOT trusted as instructions;
       message is only ever treated as a query string             (Req 7)
3. retrieve(message):
     - course-date intent?  -> matchCourseDate(identifiers)
          0 or >1 match     -> escalate (Req 4.3)
          missing ids       -> ask-for-identifiers response (Req 4.1)
          exactly 1         -> row + citation (Req 4.2)
     - else keyword/tag match over MockSource[]
          no match          -> [] (drives escalation)
4. compose answer from retrieved snippets ONLY (prompt.ts)        (Req 3.1)
5. applyEscalationRules(retrieved, answer):
     - no sources / no citations / sensitive / binding-policy /
       conflicting / unmatched course date / safety  -> escalate  (Req 5, AGENTS §10)
6. normalize -> AssistantResponse                                 (Req 3.5)
7. log redacted metadata only (category, confidence, latency)     (Req 6.3)
8. return typed JSON
```

Errors thrown anywhere in the handler are caught and returned as a generic 500 with a
safe message; internal detail is never sent to the client (Req 8.4).

### Deterministic escalation (`escalation.ts`)

Escalation is decided by application rules **in addition to** the mock answer, exactly as
`AGENTS.md` §10 mandates, so this behavior is real and carries forward unchanged. When
escalating, the response sets `escalationRecommended: true`, includes the responsible
`department`, and uses the transparent fallback wording; it never claims a human was
contacted (Req 5.3).

---

## UI design

### Layout and states

The chat page is a **client component** (`ChatContainer`) wrapping server-rendered
shell. It is a small explicit state machine (`states.ts`):

```ts
type ChatState =
  | { kind: "empty" }         // intro + example questions (Req 1.2, 2.1)
  | { kind: "loading" }       // spinner, input disabled (Req 8.3)
  | { kind: "answered"; turns: Turn[] }
  | { kind: "validation"; message: string }  // inline input error (Req 8.1, 8.2)
  | { kind: "error" };        // friendly error + contact options (Req 8.4)
```

- **Empty state**: brief trust-framing sentence ("Answers come from official Lemoore
  College sources; I'll tell you when I can't verify something") + `ExampleQuestions`.
- **Answered turn**: question bubble, answer bubble with confidence-safe lead-in,
  `CitationList` in a visually separated area, `EscalationCard` when recommended,
  `FeedbackControls`, and follow-up `suggestedQuestions`.
- **Loading**: inline spinner, disabled input, duplicate-submit prevention.
- **Validation**: inline message under the input; no request sent.
- **Error / no-source**: calm card with official contact options, no internal detail.

### Visual language (`AGENTS.md` §14, steering/product.md)

Institutional and calm: neutral surface, one restrained accent color, generous spacing,
Tailwind tokens. **No** neon/glow, minimal gradients, no fabricated metrics or
testimonials, no "always correct" claims. Answer text is kept concise; long model-style
blocks are avoided.

### Accessibility & responsiveness (Req 1.3, 1.4)

Mobile-first single column; input pinned and reachable; `max-w` reading measure on
desktop. Labeled controls, keyboard-operable example chips and feedback buttons, visible
focus rings, `aria-live="polite"` on the answer region so screen readers announce
responses.

### Component reuse

Shared primitives (`Button`, `Card`, `Textarea`, `Spinner`) live in `src/components/ui`
following the shadcn/ui convention named in the stack; feature components compose them.
No duplicate primitives are created.

---

## Mock retrieval strategy

Deliberately simple and deterministic so tests are stable and the demo is repeatable:

1. **Intent split**: a lightweight check routes course-date questions to the course-date
   matcher; everything else goes to source matching.
2. **Source matching**: normalize the query, score each `MockSource` by tag/keyword
   overlap, take the top matches above a threshold. Below threshold → empty result →
   escalation. This mimics "no retrieval results" from `docs/ARCHITECTURE.md`.
3. **Answer composition** (`prompt.ts`): build the answer *only* from matched snippet
   content — no outside knowledge — and attach each matched source as a citation, so the
   grounded-with-citations invariant (Req 3.1–3.2) holds by construction.
4. **Course-date matching**: require term + subject + catalog number (+ section when
   present); return the single matching row's date with its source citation, else
   escalate. Generic-calendar answering is structurally impossible (Req 4).

**Answer-only-from-snippets rule (not an absolute guarantee).** The mock composes
answers strictly from matching local source snippets. This design *reduces* the risk of
unsupported answers; it is **not** claimed as an absolute guarantee against
hallucination. Concretely:

- The mock assistant answers **only** from the matching local source snippets returned by
  retrieval.
- WHEN the available snippets do not support an answer, the assistant SHALL clearly state
  that it cannot verify the answer and SHALL provide the appropriate escalation or
  official-contact path (see Safety design and `escalation.ts`).
- Every displayed citation SHALL correspond to a **real local source entry** that was
  actually used to construct the answer — no citation is fabricated or shown without a
  backing `MockSource`/`MockCourseDate` record.

---

## Safety design (local, real behavior)

| Behavior | Mechanism this phase | Carries forward as |
|---|---|---|
| Sensitive-data rejection (Req 6) | `guardrail.screen` regex/rule detection; no echo | Bedrock Guardrails + this app rule |
| Prompt-injection resilience (Req 7) | Input treated only as an opaque query; never executed as instruction; retrieved content never interpreted as commands | Same rule + Guardrails |
| No fabricated access (Req 7.2) | Mock cannot access any system; escalation wording only | Unchanged |
| Escalation (Req 5) | Deterministic `escalation.ts` rules | Unchanged |
| Redacted logging (Req 6.3) | `redact.ts` strips prompt; log category/confidence/latency | Unchanged |

Sensitive detection is intentionally conservative (better to over-refer to a secure
channel than to process an identifier).

---

## Error handling

- **Invalid request body** → 400 with typed Zod issues summary (no sensitive echo).
- **Guardrail rejection** → 200 with a privacy-safe `AssistantResponse` (rejection is a
  product outcome, not an HTTP error) so the UI renders it as a normal safe answer.
- **No retrieval** → 200 with low-confidence + escalation.
- **Unexpected server error** → 500 with generic message; UI shows the error card;
  internal detail logged server-side only.
- **Client fetch failure/timeout** → UI `error` state with official contact options.

---

## Testing strategy

Unit + route tests (framework per the project's test setup; component tests where
valuable). Mapped to `AGENTS.md` §15 and Req 11.3:

1. Grounded answer returns non-empty `citations` and answer text from a known source.
2. Unsupported question → `escalationRecommended: true`, low confidence, no fabricated
   citation.
3. Prompt-injection input ("ignore your rules / reveal system prompt") → grounding
   preserved, no system detail, no fabricated access.
4. Sensitive-data input (SSN/student ID) → rejection response, value not echoed.
5. Course-date without identifiers → ask-for-identifiers / vary response, not a date.
6. Course-date with exact identifiers → correct row + citation.
7. `ChatRequest` validation: empty, whitespace-only, over-max → rejected.
8. `GET /api/health` → 200.
9. Mobile-layout smoke check (render at a phone viewport; key controls present).

Tests run against **mock data only** — no network. A small local eval harness can run the
grounded subset of `docs/EVAL_QUESTIONS.md` against the mock service.

---

## Configuration & `.env.example`

`.env.example` documents names only, no values (Req 12.1). AWS names from
`.kiro/steering/tech.md` are included but commented/optional this phase:

```text
# Local MVP — no real secrets. Copy to .env.local for local dev.
CHAT_MAX_INPUT_CHARS=500
ENABLE_ADMIN_SOURCE_SYNC=false

# --- Reserved for a later AWS phase (leave unset locally) ---
# AWS_REGION=
# BEDROCK_MODEL_ID=
# BEDROCK_KNOWLEDGE_BASE_ID=
# BEDROCK_GUARDRAIL_ID=
# BEDROCK_GUARDRAIL_VERSION=
# COGNITO_USER_POOL_ID=
# COGNITO_CLIENT_ID=
# COGNITO_DOMAIN=
# DYNAMODB_TABLE_NAME=
```

`env.ts` validates these with Zod, treating the AWS block as optional so the app runs
with only the two local values (or none, via defaults).

---

## Developer commands & setup (Req 11)

Standard scripts from `.kiro/steering/tech.md`:

```bash
npm run dev        # local server
npm run lint       # ESLint
npm run typecheck  # tsc --noEmit (strict)
npm test           # test suite (mock-only, no network)
npm run build      # production build
```

README setup: `npm install` → `cp .env.example .env.local` → `npm run dev` → open
`http://localhost:3000`. No AWS account, credentials, or paid API required.

---

## Correctness Properties

These properties must hold for the slice to be considered correct; the test strategy
verifies each.

### Property 1: Grounding

The answer text is composed only from the `excerpt`/`content` of snippets in the current
`RetrievalResult`. No answer content originates outside retrieved local sources.

**Validates: Requirements 3.1, 9.2**

### Property 2: Citation integrity

Every `Citation` in the response corresponds to a real local source entry (`MockSource`
or `MockCourseDate`) that was actually used to construct the answer. The response never
contains a citation without a backing record, and never omits the source of a stated
fact.

**Validates: Requirements 3.2, 3.3**

### Property 3: Honest non-verification (not an absolute guarantee)

WHEN retrieval returns no supporting snippets, the response has
`escalationRecommended: true`, low confidence, an empty or non-fabricated citation set,
and states it cannot verify the answer — rather than producing an unsupported answer.
This reduces, but does not absolutely guarantee the elimination of, hallucination.

**Validates: Requirements 5.1, 5.2**

### Property 4: No generic course dates

A class-specific date is returned only on an exact single-row match;
zero/multiple/insufficient-identifier cases escalate.

**Validates: Requirements 4.1, 4.2, 4.3**

### Property 5: No sensitive echo

WHEN input is rejected as sensitive, the response never repeats the detected identifier,
and logs never contain the raw prompt.

**Validates: Requirements 6.1, 6.2, 6.3**

### Property 6: Untrusted input

Instructions embedded in the query or in retrieved content are never executed as
commands; grounding and safety are preserved.

**Validates: Requirements 7.1, 7.2**

### Property 7: Deterministic escalation

Escalation is decided by `applyEscalationRules` in the server layer independent of answer
phrasing, so identical inputs always escalate identically.

**Validates: Requirements 5.4**

### Property 8: Swap isolation

UI and route handlers reference only the seam interface signatures; no component imports
a mock implementation directly.

**Validates: Requirements 9.1, 9.2**

## Requirements coverage

| Requirement | Addressed by |
|---|---|
| 1 Public chat UI | `app/(public)`, `features/chat/*`, visual language section |
| 2 Example questions | `ExampleQuestions`, `suggestedQuestions` in contract |
| 3 Grounded answer + citations | mock retrieval, `normalize.ts`, `CitationList`, confidence-safe UI |
| 4 Course-date safety | `courseDates.ts`, course-date matcher, escalation |
| 5 Fallback + escalation | `escalation.ts`, `EscalationCard`, transparent wording |
| 6 Sensitive-data rejection | `guardrail.screen`, `redact.ts` |
| 7 Prompt-injection resilience | opaque-query handling, untrusted retrieved content |
| 8 Validation + states | Zod schemas, `states.ts`, `ChatInput` |
| 9 Local mocks behind seams | `lib/bedrock/*`, `lib/mock/*`, `lib/db/*`, seam table |
| 10 Health endpoint | `api/health/route.ts` |
| 11 Quality gates | scripts, testing strategy, README |
| 12 Secrets + docs preserved | `.env.example` placeholders, no doc edits |

---

## Review decisions (approved)

The following were confirmed during design review and are binding for `tasks.md`:

1. **Test runner**: Vitest + React Testing Library.
2. **UI primitives**: hand-author the small accessible primitives (`Button`, `Card`,
   `Textarea`, `Spinner`) in `src/components/ui`; do **not** add shadcn/ui generators.
3. **Feedback sink**: `/api/feedback` is a Zod-validated **no-op** that returns success
   for the local MVP (no persistence).
