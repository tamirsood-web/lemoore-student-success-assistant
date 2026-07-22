# Implementation Plan — Local MVP Scaffold

Ordered, reviewable tasks for the local, mock-backed Public Student Mode chat slice.
Each task is small enough to review in isolation and references the requirements it
satisfies. Tasks are sequenced so that each builds on completed, testable work.

**Constraints binding on every task below:**

- No AWS calls, no Bedrock/DynamoDB/Cognito, no paid/live API. AWS integration exists
  only as fixed interface signatures with mock bodies (`src/lib/bedrock/*`,
  `src/lib/db/*`).
- No deployment (no Amplify/CDK/Terraform, no `deploy`/provisioning commands).
- No real credentials or secrets; `.env.example` holds placeholder names only.
- Do not delete or replace existing documentation (`AGENTS.md`, `CLAUDE.md`, `README.md`,
  `.github/copilot-instructions.md`, `docs/**`, `.kiro/steering/**`).
- Test runner is **Vitest + React Testing Library**; UI primitives are **hand-authored**;
  `/api/feedback` is a **validated no-op**.

**Standing implementation rules (apply to every task):**

1. Use **npm** as the only package manager.
2. Commit `package-lock.json`.
3. Do **not** generate `pnpm-lock.yaml` or `yarn.lock`.
4. After every task group, run the relevant verification commands and **stop for review**
   before moving to the next group.
5. Do **not** use Git commands that discard work (e.g. `git reset --hard`,
   `git clean -fd`, `git checkout -- .`).
6. Do **not** deploy anything or make any AWS calls.

---

## Overview

Group 1 (Scaffolding & Configuration) establishes the Next.js + TypeScript project,
Tailwind, ESLint, and the Vitest + React Testing Library harness, with npm scripts and a
safe `.env.example`. Groups 2–10 build types, mock data, server logic, API routes, UI,
tests, docs, and verification on top of that base. Each group is implemented and verified
before the next begins.

## Task Dependency Graph

```text
1 Scaffolding & Config
        |
        v
2 Types
        |
        v
3 Validation (Zod)
        |
        v
4 Mock data ------> 5 Retrieval / Guardrail / Escalation / Normalize
                                    |
                                    v
                            6 API routes
                                    |
                                    v
                            7 UI components
                                    |
                                    v
                            8 Tests
                                    |
                                    v
                            9 Documentation
                                    |
                                    v
                           10 Verification gates
```

Group order is strict: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10. Types (2) underpin all
later groups; validation (3) and mock data (4) precede the server logic (5) that consumes
them; API routes (6) wrap that logic; UI (7) consumes the routes; tests (8) cover the
whole slice; docs (9) and gates (10) close out.

Wave definitions (each wave is verified and reviewed before the next begins):

```json
{
  "waves": [
    { "wave": 1, "tasks": ["1"], "dependsOn": [] },
    { "wave": 2, "tasks": ["2"], "dependsOn": ["1"] },
    { "wave": 3, "tasks": ["3"], "dependsOn": ["2"] },
    { "wave": 4, "tasks": ["4"], "dependsOn": ["3"] },
    { "wave": 5, "tasks": ["5"], "dependsOn": ["4"] },
    { "wave": 6, "tasks": ["6"], "dependsOn": ["5"] },
    { "wave": 7, "tasks": ["7"], "dependsOn": ["6"] },
    { "wave": 8, "tasks": ["8"], "dependsOn": ["7"] },
    { "wave": 9, "tasks": ["9"], "dependsOn": ["8"] },
    { "wave": 10, "tasks": ["10"], "dependsOn": ["9"] }
  ]
}
```

## Tasks

## 1. Project scaffolding and configuration

- [x] 1.1 Initialize the Next.js (App Router) + TypeScript project in place
  - Create a Next.js App Router project with TypeScript **strict mode** enabled.
  - Configure `src/` directory layout matching `.kiro/steering/structure.md`.
  - Do not overwrite or remove existing `docs/`, `.kiro/`, or root instruction files.
  - _Requirements: 1.1, 11.1, 11.2, 12.2_

- [x] 1.2 Configure Tailwind CSS and global styles
  - Add Tailwind, `globals.css` with base layers, and an institutional/calm neutral +
    single-accent token set (no neon, minimal gradients).
  - _Requirements: 1.5, 11.1_

- [x] 1.3 Configure tooling: ESLint, TypeScript, Vitest, RTL, scripts
  - Add `lint`, `typecheck` (`tsc --noEmit`), `test` (Vitest), `build`, `dev` scripts
    matching `.kiro/steering/tech.md`.
  - Configure Vitest + React Testing Library with a jsdom environment; ensure tests run
    with no network access.
  - _Requirements: 11.1, 11.2, 11.3_

- [x] 1.4 Add `.env.example` and `.gitignore` hygiene
  - `.env.example` with `CHAT_MAX_INPUT_CHARS`, `ENABLE_ADMIN_SOURCE_SYNC`, and the
    reserved AWS names commented/optional. No real values.
  - Ensure `.env.local` and secrets are git-ignored.
  - _Requirements: 9.4, 12.1_
  - NOTE: the existing tracked `.env.example` already contains only safe placeholder
    names/values (no secrets); the harness blocks writes to `.env*` files, so it was left
    as-is. AWS-var optionality is enforced by the Zod env loader in task 3.1. `.gitignore`
    already ignores `.env*` except `.env.example`; `package-lock.json` is committed and no
    `yarn.lock`/`pnpm-lock.yaml` exist.

- [x] 1.5 Create directory seams for out-of-scope areas
  - Create empty `src/app/ambassador/`, `src/app/admin/`, `src/lib/auth/` placeholders
    (with a short README/`.gitkeep`) so structure matches, but do not implement them.
  - _Requirements: 9.2_

## 2. Types and shared contracts

- [x] 2.1 Define the `AssistantResponse` contract and related types
  - `src/types/assistant.ts`: `Confidence`, `Citation`, `AssistantResponse` per
    `AGENTS.md` §9.
  - _Requirements: 3.5_
  - NOTE: `AssistantResponse` is modeled as an explicit discriminated union over `kind`
    (`grounded` | `insufficient_evidence` | `safe_rejection`) per the response-contract
    rules; every variant carries the §9 fields and a compile-time assertion
    (`_Section9Conformance`) proves conformance. `Citation` gains a required `sourceId`
    (Property 2). Related state types live alongside: `SafeRejection`,
    `EscalationGuidance`/`EscalationReason`/`DepartmentContact` (`escalation.ts`),
    `SensitiveCategory` (`guardrail.ts`).

- [x] 2.2 Define seam interface types (no implementations yet)
  - `RetrievedSnippet`, `RetrievalResult`, `GuardrailVerdict`, feedback input types as
    declared in the design's Components and Interfaces section.
  - _Requirements: 9.2_
  - NOTE: seam types are centralized in `src/types/` (design designates it as the home for
    shared types) and re-exported from `src/types/index.ts`. Added function-type + object
    interfaces for every seam future code must satisfy — retrieval (`RetrieveFn` /
    `RetrievalService`), guardrail, escalation (`ApplyEscalationRulesFn` /
    `EscalationDecision`), normalization (`ToAssistantResponseFn` / `NormalizeInput`),
    redaction (`RedactFn` / `RedactedLogRecord`), and persistence (`RecordFeedbackFn` /
    `FeedbackRepository`). The design's `MockSource`/`MockCourseDate` are defined as
    permanent domain types `Source`/`CourseDate` (`source.ts`). No implementations, mock
    data, or Zod schemas were added.

## 3. Environment and input validation (Zod)

- [x] 3.1 Zod-validated environment loader
  - `src/lib/validation/env.ts`: validate env; AWS vars **optional** so the app boots
    without them; `CHAT_MAX_INPUT_CHARS` default.
  - _Requirements: 9.4_
  - NOTE: default `CHAT_MAX_INPUT_CHARS` is **2000** to match the committed `.env.example`
    (the design's "e.g. 500" was illustrative). All AWS vars are `.optional()` and
    empty/whitespace values are coerced to unset. Exposes `parseEnv` (safe result),
    `loadEnv` (fail-fast), `getEnv` (memoized), and an `AppConfig` type inferred from the
    schema. Validated config is normalized to a nested `aws.{bedrock,cognito}` shape.

- [x] 3.2 Zod request schemas
  - `src/lib/validation/schemas.ts`: `chatRequestSchema` (trimmed, min 1, max
    `CHAT_MAX_INPUT_CHARS`), `feedbackRequestSchema`. No client-supplied role/mode is
    trusted (unknown keys stripped).
  - Unit tests: empty, whitespace-only, over-max rejected; valid accepted.
  - _Requirements: 8.1, 8.2, 8.5_
  - NOTE: added `src/lib/validation/parse.ts` (`safeParse` → structured `ValidationResult`
    with user-safe messages) and a `src/lib/validation/index.ts` barrel. `parseChatRequest`
    / `parseFeedbackRequest` return the existing `@/types` domain contracts
    (`ChatRequestBody` / `FeedbackInput`); compile-time assertions enforce that the
    Zod-inferred types agree with those contracts. 17 validation unit tests added; only
    input-shape validation is implemented (no guardrail/sensitive-data behavior).

## 4. Mock knowledge data

- [x] 4.1 Mock approved-source dataset
  - `src/lib/mock/sources.ts`: `Source[]` covering admissions/records, financial-aid
    FAQ, counseling/registration, academic calendar, transcript/degree posting, office
    hours/contacts, adult-learner services (from `docs/ARCHITECTURE.md` categories and
    `docs/EVAL_QUESTIONS.md`). Clearly labeled as mock/sample content.
  - _Requirements: 3.1, 9.3_
  - NOTE: 10 sources typed with the Group 2 `Source` type. IDs are stable `src_`-prefixed
    slugs; `department` is typed as `DepartmentId` at authoring time (compile-time
    integrity). Every `content` ends with `MOCK_DATA_DISCLAIMER`. Exposes `sourceById`,
    `sourceTitles`, `getSourceById`. All specific hours/steps/contacts are labeled demo
    content — only the categories and institution name are repo-derived.

- [x] 4.2 Mock course-date dataset
  - `src/lib/mock/courseDates.ts`: `CourseDate[]` preserving term, subject,
    catalogNumber, section, startDate, censusDate, dropDate, sourceTitle (exact-match
    fields not flattened).
  - _Requirements: 4.2, 9.3_
  - NOTE: 4 records (Fall 2025 + Spring 2026), ISO-8601 dates, each referencing the sample
    course-date source by title (`COURSE_DATE_SOURCE_TITLE`) so every citation maps to a
    real source record.

- [x] 4.3 Department/contact directory for escalation
  - `src/lib/mock/departments.ts`: department names + (mock) contact info used
    by escalation cards.
  - _Requirements: 5.2, 9.3_
  - NOTE: 5 departments keyed by `DepartmentId` (`admissions_records`, `financial_aid`,
    `counseling`, `adult_learner_services`, `student_services`) with `getDepartment` /
    `isDepartmentId`. Contact details use reserved fictional patterns (`.example` TLD,
    `(000) 555-01xx`) so they are obviously not real. Barrel at `src/lib/mock/index.ts`;
    16 integrity tests in `src/lib/mock/mock.test.ts`. No retrieval/ranking, answer
    composition, guardrail, or route logic added.

## 5. Retrieval, guardrail, escalation, normalization (server-only mocks behind seams)

- [ ] 5.1 Mock retrieval behind the fixed `retrieve()` signature
  - `src/lib/bedrock/retrieve.ts`: intent split (source vs. course-date); tag/keyword
    scoring over `MockSource[]` with a threshold; below threshold → empty snippets.
  - Course-date: return `needsIdentifiers` when insufficient; exact single-row match →
    one snippet; zero/multiple → empty.
  - Unit tests for match, no-match, and each course-date branch.
  - _Requirements: 3.1, 4.1, 4.2, 4.3, 9.1, 9.2_

- [ ] 5.2 Answer composition from snippets only
  - `src/lib/bedrock/prompt.ts`: build the answer **only** from matched snippet content.
    WHEN no snippets support an answer, produce the cannot-verify outcome (no invented
    content).
  - Unit test: composed answer contains no text absent from snippets.
  - _Requirements: 3.1 (Property 1), 5.1 (Property 3)_

- [ ] 5.3 Mock guardrail: sensitive-data detection (no echo)
  - `src/lib/bedrock/guardrail.ts`: `screen()` detects SSN/student ID/DOB/password/bank
    patterns → `{ ok:false, reason:"sensitive", safeMessage, department }`; never
    includes the detected value.
  - Treat injection markers as data only — never as instructions.
  - Unit tests: sensitive detected + not echoed; injection strings pass through as inert
    queries.
  - _Requirements: 6.1, 6.2, 7.1, 7.2_

- [ ] 5.4 Redaction utility for logging
  - `src/lib/utils/redact.ts`: produce redacted/minimized log payload (category,
    confidence, latency); never the raw prompt.
  - _Requirements: 6.3_

- [ ] 5.5 Deterministic escalation rules
  - `src/lib/bedrock/escalation.ts`: `applyEscalationRules()` escalates on no
    sources / missing citations / sensitive / binding-policy / conflicting / unmatched
    course date / safety; sets department; never claims a human was contacted.
  - Unit tests for each escalation trigger; determinism (same input → same result).
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [ ] 5.6 Normalization to `AssistantResponse`
  - `src/lib/bedrock/normalize.ts`: assemble `answer`, confidence, `citations` (each
    backed by a real source entry used in the answer), `department?`,
    `escalationRecommended`, `suggestedQuestions`.
  - Unit test: every emitted citation maps to a real source record (Property 2).
  - _Requirements: 3.2, 3.3, 3.5_

## 6. API route handlers (server-only)

- [ ] 6.1 `POST /api/chat`
  - `src/app/api/chat/route.ts`: Zod-validate → `guardrail.screen` → `retrieve` →
    compose → `applyEscalationRules` → `normalize` → redacted log → typed JSON.
  - 400 on invalid input; 500 with generic safe message on unexpected error (no internal
    detail leaked); guardrail rejection returned as a normal 200 `AssistantResponse`.
  - Route tests: grounded answer, unsupported→escalation, course-date-without-ids,
    injection, sensitive-data, validation 400.
  - _Requirements: 3.1, 3.2, 4.1, 5.1, 6.1, 7.1, 8.4, 8.5_

- [ ] 6.2 `POST /api/feedback` (validated no-op)
  - `src/app/api/feedback/route.ts`: Zod-validate `FeedbackRequest`; call
    `db/feedback.ts` no-op sink; return `{ ok: true }`; 400 on invalid.
  - `src/lib/db/feedback.ts`: no-op returning success behind the fixed signature.
  - Route test: valid → 200; invalid → 400.
  - _Requirements: 8.5, 9.1, 9.2_

- [ ] 6.3 `GET /api/health`
  - `src/app/api/health/route.ts`: return 200 `{ status: "ok" }`, no auth, no deps.
  - Route test: 200 status payload.
  - _Requirements: 10.1_

## 7. UI components

- [ ] 7.1 Hand-authored accessible primitives
  - `src/components/ui/`: `Button`, `Card`, `Textarea`, `Spinner` with labels, keyboard
    operability, and visible focus states. No shadcn/ui generators.
  - _Requirements: 1.4_

- [ ] 7.2 Chat state machine and container
  - `src/features/chat/states.ts` (`ChatState` union) and `ChatContainer.tsx` (client):
    owns state, calls `/api/chat`, prevents duplicate submits.
  - _Requirements: 8.3_

- [ ] 7.3 Chat input with validation
  - `ChatInput.tsx`: disable submit on empty/whitespace; inline message on
    over-`CHAT_MAX_INPUT_CHARS`; no request sent when invalid.
  - _Requirements: 8.1, 8.2_

- [ ] 7.4 Message rendering with confidence-safe language
  - `MessageList.tsx`, `MessageBubble.tsx`: render question/answer turns; map confidence
    enum to student-friendly lead-in; never show numeric scores; keep answers concise;
    `aria-live="polite"` on the answer region.
  - _Requirements: 1.4, 3.4_

- [ ] 7.5 Citations UI
  - `citations/CitationList.tsx`, `CitationCard.tsx`: visually separated citation area;
    linked title when `uri` present, plain title otherwise.
  - _Requirements: 3.2, 3.3_

- [ ] 7.6 Escalation card
  - `escalation/EscalationCard.tsx`: shown when `escalationRecommended`; department +
    official contact + transparent wording; no claim a human was contacted.
  - _Requirements: 5.2, 5.3_

- [ ] 7.7 Feedback controls
  - `feedback/FeedbackControls.tsx`: helpful/unhelpful → `POST /api/feedback`; reflect
    success/failure without blocking the chat.
  - _Requirements: 8.4_

- [ ] 7.8 Empty state and example/follow-up questions
  - `EmptyState.tsx` + `ExampleQuestions.tsx`: trust-framing intro and suggestion chips
    (from grounded set); selecting a chip submits it; render response
    `suggestedQuestions` as follow-ups.
  - _Requirements: 1.2, 2.1, 2.2, 2.3_

- [ ] 7.9 Public page assembly, layout, and mobile-first responsiveness
  - `app/(public)/page.tsx` + `layout.tsx`: assemble the chat experience; mobile-first
    single column, reachable input, no horizontal scroll; desktop reading measure.
  - Loading, empty, validation, and error states all reachable through the UI.
  - _Requirements: 1.1, 1.3, 8.3, 8.4_

## 8. Tests (Vitest + RTL)

- [ ] 8.1 Server/unit test suite (aggregate the tests written in tasks 3–6)
  - Ensure coverage of: grounded answer with citations; unsupported→escalation;
    prompt-injection; sensitive-data request; course-date without identifiers;
    course-date exact match; input validation; health endpoint.
  - _Requirements: 11.3_

- [ ] 8.2 Correctness-property tests
  - Grounding (answer ⊆ snippets), citation integrity (every citation → real source),
    honest non-verification, no generic course dates, no sensitive echo, deterministic
    escalation.
  - _Requirements: 3.1, 3.2, 4.3, 5.1, 5.4, 6.2_

- [ ] 8.3 Component + mobile-layout smoke tests (RTL)
  - Render chat at a phone viewport; assert key controls present, focus states, and that
    empty/loading/validation/error states render.
  - _Requirements: 1.3, 1.4, 8.3_

- [ ] 8.4 Local eval-subset harness
  - Small script/test running the grounded subset of `docs/EVAL_QUESTIONS.md` against the
    mock service (no network); record grounded/cited/escalated outcomes.
  - _Requirements: 11.3_

## 9. Documentation

- [x] 9.1 README local-setup section
  - Add setup steps: `npm install` → `cp .env.example .env.local` → `npm run dev` →
    `http://localhost:3000`; state clearly that no AWS account or paid API is required.
  - Do not modify existing instruction docs beyond adding this setup content.
  - _Requirements: 11.4, 12.2_
  - NOTE: added a "Local Development (Current MVP)" section to `README.md` (existing
    Agent-Pack content preserved): clone → `cd` → `npm install` → copy `.env.example` to
    `.env.local` (PowerShell `Copy-Item` + macOS/Linux `cp`) → `npm run dev` →
    http://localhost:3000, plus the four verification commands. States: runs entirely
    locally, no AWS account, no paid/live model, deterministic local mock data + mock
    services, `/api/feedback` is a validated no-op that stores nothing, `.env.local` must
    not be committed, `.env.example` has safe placeholders only, content is sample/mock.
    npm only; no secrets/ARNs/regions/deployment commands. NOTE: this branch had Groups
    5–8 reverted in git; they were restored (user-authorized) from commit `e313e0f` before
    documenting, so every documented file/route/seam actually exists.

- [x] 9.2 Note the AWS-swap seam in docs
  - Briefly document that retrieval/guardrail/persistence are local mocks behind fixed
    interfaces to be replaced in a later AWS phase. Do not alter `docs/AWS_SETUP.md`
    content beyond additive notes if needed.
  - _Requirements: 9.2, 12.2_
  - NOTE: added an "Architecture Seams: Local Mocks Today, AWS Later" section to
    `README.md` documenting each seam with accurate repo-relative paths — retrieval
    (`src/lib/bedrock/retrieve.ts`), guardrail (`src/lib/bedrock/guardrail.ts`),
    composition/normalization (`src/lib/bedrock/prompt.ts` + `normalize.ts`, with the
    grounding/citation/honest-non-verification/sensitive-data invariants any future model
    must preserve), and feedback persistence (`src/lib/db/feedback.ts` no-op). Also states
    routes keep calling the same interfaces, AWS creds/server-only config never enter the
    client bundle, and AWS env vars are optional placeholders. Added a clearly-labeled
    additive "Current Local MVP Status" note at the top of `docs/AWS_SETUP.md` (no existing
    content removed or contradicted), distinguishing what exists now from what is planned.

## 10. Verification gates

- [x] 10.1 Run `npm run lint` and resolve issues
  - _Requirements: 11.1_
  - NOTE: `npm run lint` (`next lint`) exits clean — "No ESLint warnings or errors". No
    rules disabled, no eslint-disable comments added, no lint config weakened, no
    dependencies added. (Next.js prints a deprecation notice that `next lint` will be
    removed in Next 16; this is informational only and not a lint error/warning — left
    unchanged as it is outside Group 10 scope.)

- [x] 10.2 Run `npm run typecheck` (strict) and resolve issues
  - No `any` except unavoidable + documented.
  - _Requirements: 11.1, 11.2_
  - NOTE: `npm run typecheck` (`tsc --noEmit`) exits clean with zero errors. TypeScript
    strict mode remains enabled (`tsconfig.json` unchanged). No `any` introduced, no unsafe
    casts, no strictness weakened; the `AssistantResponse` discriminated union, API
    contracts, validation contracts, and seam interfaces are unchanged.

- [x] 10.3 Run `npm test` and ensure all tests pass (no network)
  - _Requirements: 11.1, 11.3_
  - NOTE: `npm test` (`vitest run`) passes — **23 test files, 200 tests**, no failures/skips.
    Deterministic, no network, no AWS/credentials/DB/paid API/live model. Route tests call
    handlers locally; global fetch mocks are restored between tests. The local eval subset
    (21 cases) honestly separates grounded (9), escalate (10), and reject (2) outcomes, and
    sensitive values are redacted in logs/output ([redacted-number]/[redacted-id]). No
    assertions weakened or removed; no tests added to inflate the count.

- [x] 10.4 Run `npm run build` and confirm a clean production build
  - Confirm no AWS credentials/secrets reach the client bundle.
  - _Requirements: 11.1_
  - NOTE: `npm run build` (`next build`) succeeds (exit 0). Routes: `○ /` (single static
    root page — no duplicate root), and `ƒ /api/chat`, `ƒ /api/feedback`, `ƒ /api/health`
    (server-rendered). Build ran with no AWS variables set, confirming the app builds
    without them. Client static bundle (`.next/static`) scanned for AWS_REGION,
    AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, BEDROCK_/COGNITO_/DYNAMODB_ prefixes, `secret`,
    `process.env.*`, and server-only mock internals (MOCK_DATA_DISCLAIMER, redactedQuestion):
    **none present**. The only `credential` hits are unavoidable React/Next runtime tokens
    (`credentials:"same-origin"`, `use-credentials`, URL polyfill `includesCredentials()`) —
    not secrets. No build checks disabled; no deployment performed.

- [x] 10.5 Final review checklist
  - Confirm: no AWS calls, no deployment, no real secrets, existing docs intact, all
    four gates green.
  - _Requirements: 9.1, 12.1, 12.2_
  - NOTE: Repository-wide final review passed with **no production-code changes required**.
    App remains a local, deterministic, mock-backed MVP: no AWS/Bedrock/DynamoDB/Cognito/
    Amplify calls, no live model or paid API. Retrieval/guardrail/feedback stay behind their
    seams; `/api/feedback` is a validated no-op (`src/lib/db/feedback.ts` stores nothing);
    the browser UI calls only `/api/chat` and `/api/feedback`. Answers are composed only from
    retrieved snippets; unsupported → honest non-verification; citations map to real sources;
    course-date requests need identifiers (no generic dates); sensitive input is rejected
    without echo; injection stays inert data; escalation never claims a human was contacted;
    logging is redacted (never the raw prompt). No real credentials/keys/ARNs; `.env.local`
    ignored; `.env.example` placeholders only; boots without AWS vars; no server-only value
    in client code. No deployment/infra config added. npm-only, `package-lock.json` present,
    no `pnpm-lock.yaml`/`yarn.lock`; no dependencies added; AGENTS/CLAUDE/steering/docs
    intact. No admin/ambassador/auth/analytics/tracking/real-persistence added. UI keeps
    empty/loading/success/validation/escalation/feedback/error states, accessible names,
    keyboard/focus/aria-live behavior, mobile overflow protection, and descriptive (non-
    numeric) confidence. All four gates (lint, typecheck, test, build) are green.

## Notes

- npm is the only package manager; `package-lock.json` is committed; no `pnpm-lock.yaml`
  or `yarn.lock`.
- After every task group, run the relevant verification commands and stop for review
  before moving to the next group.
- No Git commands that discard work (`git reset --hard`, `git clean -fd`,
  `git checkout -- .`).
- No deployment and no AWS calls at any point in this spec; AWS integration exists only
  as fixed interface signatures with local mock bodies.
