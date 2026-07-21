# Project Structure

```
src/
  app/
    (public)/          # Unauthenticated student UI
    ambassador/        # Cognito-protected ambassador pages
    admin/             # Cognito-protected admin/staff pages
    api/
      chat/            # POST /api/chat
      feedback/        # POST /api/feedback
      admin/           # GET /api/admin/analytics, POST /api/admin/sources/sync
      health/          # GET /api/health

  components/          # Shared, reusable UI primitives

  features/
    chat/              # Chat UI, message list, input, streaming state
    citations/         # Citation card, source link rendering
    feedback/          # Helpful/unhelpful controls, submission logic
    escalation/        # Escalation card, department contact display
    analytics/         # Dashboard charts and question tables

  lib/
    aws/               # AWS SDK client instances and low-level wrappers
    auth/              # Cognito JWT verification, session helpers
    bedrock/           # RAG query, answer normalization, citation mapping
    db/                # DynamoDB read/write helpers
    validation/        # Shared Zod schemas

  types/               # Shared TypeScript types (AssistantResponse, etc.)

infra/                 # AWS CDK TypeScript (optional, if used)
docs/                  # Architecture, setup, eval questions, demo script
scripts/               # One-off ingestion or migration scripts
```

## Placement Rules

- **AWS SDK / server-only code** → `src/lib/aws` or `src/lib/bedrock`. Never imported by client components.
- **Feature-specific UI + logic** → `src/features/<feature>`.
- **Shared UI primitives** → `src/components`.
- **Route handlers** → `src/app/api/<route>/route.ts`.
- **Types used across features** → `src/types`.

## API Surface

| Method | Path | Auth |
|---|---|---|
| POST | `/api/chat` | Public (rate-limited) |
| POST | `/api/feedback` | Public |
| GET | `/api/admin/analytics` | `admins` Cognito group |
| POST | `/api/admin/sources/sync` | `admins` Cognito group |
| GET | `/api/health` | Public |

## Auth Model

- `/` and `/api/chat` — anonymous, no Cognito required.
- `/ambassador/*` — Cognito user in `ambassadors` or `admins` group.
- `/admin/*` — Cognito user in `admins` group only.
- Role is determined from the verified JWT, never from client-supplied data.

## DynamoDB Entities

- **Conversation** — `conversationId`, `mode`, `confidence`, `escalationRecommended`, `redactedQuestion`, `latencyMs`, `createdAt`
- **Feedback** — `feedbackId`, `conversationId`, `helpful`, `reason?`, `createdAt`
- **UnansweredQuestion** — `questionId`, `redactedQuestion`, `category`, `department?`, `status`, `createdAt`
