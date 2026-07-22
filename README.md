# Lemoore Student Success Assistant — Agent Pack

This package contains the shared instructions and planning files for the hackathon repository.

## Local Development (Current MVP)

The current MVP is the **Public Student Mode grounded-chat vertical slice**, and it runs
**entirely locally**:

- **No AWS account is required.**
- **No paid API or live AI model is required.**
- Retrieval, safety screening, and feedback are served by **deterministic local mock data
  and local mock service implementations** — not a live model. The assistant composes
  answers only from a small set of **sample/mock** local sources; it is not "AI-powered"
  in this phase.

The institutional content (sources, department contacts, and course dates) is
**sample/mock content for local development only** — it is not official or live Lemoore
College information.

### Setup

```bash
# 1. Clone the repository
git clone <repository-url>

# 2. Enter the repository directory
cd lemoore-student-success-assistant

# 3. Install dependencies (npm only)
npm install
```

Create the local environment file from the committed example:

```powershell
# Windows PowerShell
Copy-Item .env.example .env.local
```

```bash
# macOS/Linux
cp .env.example .env.local
```

Start the development server:

```bash
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000) — the public student chat loads
with no sign-in.

### Verification commands

```bash
npm test          # Vitest + React Testing Library (jsdom), no network
npm run typecheck # tsc --noEmit (strict)
npm run lint      # ESLint (next lint)
npm run build     # production build
```

### Environment and secrets

- `.env.example` contains **safe placeholders only** — no real credentials, secrets,
  account IDs, regions, or ARNs. It documents `CHAT_MAX_INPUT_CHARS` and
  `ENABLE_ADMIN_SOURCE_SYNC`, plus reserved AWS variable names that are **commented and
  optional**.
- The app **boots without any AWS variables**; the Zod env loader treats them as optional.
- **Do not commit `.env.local`** — it is git-ignored. Copy it from `.env.example` locally.

### What is and isn't implemented today

- Implemented locally: the public chat UI (root `/`), `POST /api/chat`,
  `POST /api/feedback`, `GET /api/health`, Zod input validation, mock retrieval and
  guardrail screening, deterministic escalation, and grounded answer normalization with
  citations.
- `POST /api/feedback` is a **validated no-op**: it validates the request and returns
  success but **does not permanently store feedback** (no database, no persistence).
- Escalation shows official-contact guidance from sample data and **never claims a human
  has actually been contacted**.
- Not implemented in this phase: AWS/Bedrock, authentication (Cognito), ambassador/admin
  features, real persistence, analytics/tracking, and deployment. These are planned for a
  later phase (see “Architecture Seams” below) and are **not currently configured or
  deployed**.

## Architecture Seams: Local Mocks Today, AWS Later

The MVP is designed for **swap-not-rewrite**: each place the production system will call
AWS is implemented today by a local mock behind a **fixed interface**. A later AWS phase
can replace the internals without changing the UI or the API contracts. Nothing below is
configured or deployed yet — it describes the current implementation and the planned swap.

| Seam | Now (local implementation) | Later (planned) |
|---|---|---|
| Retrieval | [`src/lib/bedrock/retrieve.ts`](src/lib/bedrock/retrieve.ts) — deterministic keyword/tag match over local mock sources and course-date data | An AWS-backed retrieval service, preserving the existing retrieval contract |
| Guardrail | [`src/lib/bedrock/guardrail.ts`](src/lib/bedrock/guardrail.ts) — deterministic local pattern detection for sensitive data | An AWS-backed safety service, preserving the existing guardrail contract |
| Answer composition / normalization | [`src/lib/bedrock/prompt.ts`](src/lib/bedrock/prompt.ts) + [`src/lib/bedrock/normalize.ts`](src/lib/bedrock/normalize.ts) — deterministic, grounded strictly in retrieved snippets | Any future model integration **must preserve grounding, citation integrity, honest non-verification, and sensitive-data protections** |
| Feedback persistence | [`src/lib/db/feedback.ts`](src/lib/db/feedback.ts) — validated **no-op** that stores nothing | A persistence implementation behind the same feedback interface |

Contract rules that hold across the swap:

- API routes ([`src/app/api/chat`](src/app/api/chat), [`src/app/api/feedback`](src/app/api/feedback),
  [`src/app/api/health`](src/app/api/health)) continue to call the **same interfaces**;
  future infrastructure must not require UI components to call AWS directly.
- **AWS credentials and server-only configuration must never enter the client bundle.**
- Reserved AWS variable names may exist as **optional placeholders** in `.env.example`;
  the local MVP must boot without them, and no AWS resources are provisioned in this phase.

## Use

Copy all files into the root of the team repository while preserving folders.

Every teammate should tell their IDE agent:

> Read `AGENTS.md` and the linked files before making changes. Treat them as repository requirements.

## Important Files

- `AGENTS.md` — primary rules for all coding agents
- `CLAUDE.md` — Claude Code entry point
- `.github/copilot-instructions.md` — GitHub Copilot repository instructions
- `docs/PROJECT_CONTEXT.md` — problem and users
- `docs/ARCHITECTURE.md` — AWS-native technical design
- `docs/MVP_BACKLOG.md` — implementation order
- `docs/EVAL_QUESTIONS.md` — grounding and safety test set
- `docs/AWS_SETUP.md` — shared provisioning checklist
- `docs/DEMO_SCRIPT.md` — judged presentation flow
- `.env.example` — expected configuration names

## First Team Actions

1. Put this pack in the repository and commit it.
2. Choose one AWS region.
3. Confirm Bedrock model access.
4. Create a small approved source corpus.
5. Assign owners using the backlog.
6. Build the grounded public chat vertical slice before the dashboard or stretch features.
