# Requirements — Local MVP Scaffold

## Introduction

This spec defines the **first implementation slice** of the Lemoore Student Success
Assistant: a fully working, locally-runnable MVP that demonstrates the student-facing,
grounded question-and-answer experience **without any AWS resources, paid APIs, or
production authentication**.

Every behavior that will eventually be served by Amazon Bedrock Knowledge Bases,
Bedrock Guardrails, DynamoDB, and Cognito is served in this phase by **local mock
services and sample Lemoore College data**. The mock layer must sit behind the same
server-side boundaries and typed contracts (`AssistantResponse`) that the real AWS
integration will later implement, so that swapping mock for real is a contained change
and never a UI rewrite.

This phase is deliberately scoped to the **Public Student Mode** grounded chat vertical
slice described in `AGENTS.md` §3 and `docs/MVP_BACKLOG.md` P0 → *Student Chat*. It does
not implement ambassador sign-in, admin dashboards, feedback persistence to a database,
or any AWS provisioning.

### In Scope

- Clean, professional, mobile-first public student chat interface.
- Question-and-answer chat experience over a local mock knowledge base.
- Suggested example questions drawn from `docs/EVAL_QUESTIONS.md`.
- Grounded answers with citations, confidence-safe language, suggested follow-ups.
- Deterministic escalation and safe-fallback behavior for unsupported, sensitive,
  and prompt-injection inputs — implemented locally, no Guardrails service.
- Loading, empty, input-validation, and error states.
- Zod-validated request input and environment variables.
- Linting, type checking, testing, and production build commands.
- `.env.example` documenting configuration names with **no real secrets**.
- Local setup instructions.

### Out of Scope (this phase)

- Deploying to AWS; creating AWS resources; running Amplify, CDK, Terraform, or any
  deployment/provisioning commands.
- Connecting to Amazon Bedrock or any paid/live API.
- Production authentication (Cognito), ambassador and admin modes, protected routes.
- Persisting conversations, feedback, or analytics to a real datastore.
- Real course-date spreadsheet ingestion (a small mock dataset is used instead).
- Deleting, replacing, or restructuring existing documentation.

---

## Requirements

### Requirement 1 — Public student chat interface

**User story:** As a prospective or current student, I want a clean, calm, trustworthy
chat interface I can use on my phone without signing in, so that I can ask questions in
plain language at any hour.

#### Acceptance Criteria

1. WHEN a student opens the root route `/` THEN the system SHALL render a public
   chat interface with a prominent question input and a submit control, requiring no
   authentication.
2. WHEN the interface first loads with no messages THEN the system SHALL show an empty
   state that explains what the assistant does and displays suggested example questions.
3. WHEN the viewport is a phone-sized width THEN the system SHALL present a mobile-first
   single-column layout with the input reachable and legible without horizontal scroll.
4. WHEN the interface renders THEN the system SHALL provide accessible labels, keyboard
   navigation, and visible focus states for all interactive controls.
5. WHERE the visual design is concerned THE system SHALL feel institutional and calm and
   SHALL NOT use neon/glowing AI visuals, excessive gradients, fake testimonials, or
   fabricated metrics.

### Requirement 2 — Suggested example questions

**User story:** As a student who does not know what to ask, I want suggested example
questions, so that I can start quickly and discover what the assistant can answer.

#### Acceptance Criteria

1. WHEN the empty state is shown THEN the system SHALL display a curated set of example
   questions sourced from the grounded-answer set in `docs/EVAL_QUESTIONS.md`.
2. WHEN a student selects a suggested question THEN the system SHALL populate the input
   and submit it as if typed by the student.
3. WHEN the assistant returns an answer THEN the system SHALL display any
   `suggestedQuestions` from the response as selectable follow-ups.

### Requirement 3 — Grounded answer with citations (mock RAG)

**User story:** As a student, I want answers drawn only from official Lemoore College
information with visible citations, so that I can trust the answer and open the source.

#### Acceptance Criteria

1. WHEN a student submits a supported question THEN the system SHALL return an answer
   composed **only** from the local mock knowledge base and SHALL NOT invent college
   policies, deadlines, contacts, or student-specific information.
2. WHEN an answer is returned THEN the system SHALL include one or more citations, each
   with a `title` and optionally a `uri` and `excerpt`, rendered as a clearly separated
   citation area distinct from the answer text.
3. WHEN a citation has a `uri` THEN the system SHALL render it as an openable link;
   WHEN it has no `uri` THEN the system SHALL display the source title as non-linked text.
4. WHEN an answer is returned THEN the system SHALL express confidence using
   student-friendly language and SHALL NOT expose raw numeric confidence scores.
5. WHEN the server produces a response THEN it SHALL conform to the `AssistantResponse`
   contract in `AGENTS.md` §9 (`answer`, `confidence`, `citations`, `department?`,
   `escalationRecommended`, `suggestedQuestions`).

### Requirement 4 — Course-date safety (mock dataset)

**User story:** As a student asking about a class-specific census or drop date, I want
the assistant to require the exact course/section/term or tell me it cannot verify, so
that I am never given a wrong generic deadline.

#### Acceptance Criteria

1. WHEN a student asks for a class-specific census or drop date WITHOUT enough
   identifiers for an exact match THEN the system SHALL ask for the course, section, and
   term OR explain that dates vary, and SHALL NOT answer from a generic calendar.
2. WHEN a student provides identifiers that match exactly one row in the mock course-date
   dataset THEN the system SHALL return that row's date with a citation to that source.
3. WHEN identifiers match zero rows OR more than one row THEN the system SHALL escalate
   with a transparent fallback rather than guessing.

### Requirement 5 — Safe fallback and deterministic escalation

**User story:** As a student asking something the assistant cannot safely answer, I want
an honest explanation and a path to a human, so that I am not misled.

#### Acceptance Criteria

1. WHEN no relevant mock source is retrieved OR citations would be missing THEN the
   system SHALL return a low-confidence, non-verified response with escalation guidance.
2. WHEN escalation is recommended THEN the system SHALL display an escalation card naming
   the responsible department and its official contact from the mock data, using the
   transparent wording pattern from `AGENTS.md` §10.
3. WHEN the system escalates THEN it SHALL NOT claim that a human has actually been
   contacted.
4. WHEN escalation rules apply THEN they SHALL be evaluated deterministically in the
   server layer in addition to any mock model output (per `AGENTS.md` §10).

### Requirement 6 — Sensitive-data rejection

**User story:** As the college, I want the public assistant to refuse and not echo
sensitive identifiers, so that we practice FERPA-conscious data minimization from day one.

#### Acceptance Criteria

1. WHEN a submission contains an apparent Social Security number, student ID, date of
   birth, password, or banking detail THEN the system SHALL reject the request with a
   privacy-safe message directing the student to an official secure channel.
2. WHEN sensitive input is rejected THEN the system SHALL NOT repeat the sensitive value
   back in the response.
3. WHEN a request is logged THEN the system SHALL log only redacted/minimized data and
   SHALL NOT log the raw prompt.

### Requirement 7 — Prompt-injection resilience

**User story:** As the college, I want the assistant to ignore instructions embedded in
user input or mock documents, so that grounding and safety cannot be overridden.

#### Acceptance Criteria

1. WHEN user input or a mock source contains instructions such as "ignore your rules",
   "reveal your system prompt", or "pretend you accessed the database" THEN the system
   SHALL treat that text as untrusted data, ignore the instruction, and preserve
   grounding.
2. WHEN asked to reveal system prompts, credentials, or hidden context THEN the system
   SHALL decline and SHALL NOT fabricate access to any system.

### Requirement 8 — Input validation and request states

**User story:** As a student, I want clear feedback when my input is empty, too long, or
when something goes wrong, so that I always understand the state of the app.

#### Acceptance Criteria

1. WHEN the input is empty or whitespace-only THEN the system SHALL disable submission and
   SHALL NOT send a request.
2. WHEN the input exceeds `CHAT_MAX_INPUT_CHARS` THEN the system SHALL show an inline
   validation message and SHALL NOT send a request.
3. WHEN a request is in flight THEN the system SHALL show a clear loading indicator and
   SHALL prevent duplicate submissions.
4. WHEN the mock service or route handler fails THEN the system SHALL show a friendly
   error state offering official contact options, WITHOUT exposing internal error detail.
5. WHEN any request reaches `/api/chat` THEN the server SHALL validate the body with Zod
   before processing and SHALL return a typed 400 on invalid input.

### Requirement 9 — Local mock services and data

**User story:** As a developer, I want all knowledge, retrieval, and guardrail behavior
served by local mocks behind the eventual AWS boundaries, so that the MVP runs with no
cloud dependency and the real integration is a contained swap later.

#### Acceptance Criteria

1. WHEN the app runs locally THEN it SHALL NOT call Amazon Bedrock, DynamoDB, Cognito, or
   any paid/live external API.
2. WHERE the real system will call a Bedrock Knowledge Base THE mock retrieval service
   SHALL expose the same server-side function signature and return the same normalized
   shape, so the route handler is agnostic to mock vs. real.
3. WHEN mock Lemoore College content is used THEN it SHALL live in versioned local data
   files (approved-source snippets and a small course-date dataset) and SHALL be clearly
   labeled as mock/sample content.
4. WHEN configuration is read THEN environment variables SHALL be validated with Zod, and
   AWS-related variables SHALL be optional in this phase so the app boots without them.

### Requirement 10 — Health endpoint

**User story:** As a developer, I want a health endpoint, so that local tooling and the
future deployment can confirm the app is running.

#### Acceptance Criteria

1. WHEN `GET /api/health` is called THEN the system SHALL return a 200 with a small JSON
   status payload and SHALL NOT require authentication or any AWS resource.

### Requirement 11 — Quality gates and developer commands

**User story:** As a developer, I want linting, type checking, testing, and build
commands plus clear setup instructions, so that the project is verifiable and reproducible.

#### Acceptance Criteria

1. WHEN a developer runs `npm run lint`, `npm run typecheck`, `npm test`, and
   `npm run build` THEN each SHALL execute against this project's real configuration.
2. WHEN TypeScript compiles THEN it SHALL run in strict mode and SHALL NOT rely on `any`
   except where unavoidable and documented.
3. WHEN the test suite runs THEN it SHALL cover at minimum: a grounded answer with
   citations, an unsupported question, a prompt-injection attempt, a sensitive-data
   request, a course-date-without-identifiers case, and input validation.
4. WHEN a developer follows the README setup steps THEN they SHALL be able to run the app
   locally using `.env.example` copied to `.env.local`, with no real secrets required.

### Requirement 12 — Secrets hygiene and documentation preservation

**User story:** As the team, I want no secrets in git and existing docs preserved, so
that the repository stays safe and its source-of-truth instructions remain intact.

#### Acceptance Criteria

1. WHEN configuration is documented THEN only `.env.example` with placeholder names SHALL
   be committed, and it SHALL contain no real passwords, credentials, secrets, or API keys.
2. WHEN this spec is implemented THEN the existing `AGENTS.md`, `CLAUDE.md`, `README.md`,
   `.github/copilot-instructions.md`, `docs/**`, and `.kiro/steering/**` files SHALL NOT
   be deleted or replaced.
