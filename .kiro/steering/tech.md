# Tech Stack

## Application

| Layer | Choice |
|---|---|
| Framework | Next.js (App Router) |
| Language | TypeScript — strict mode, no `any` without comment |
| Styling | Tailwind CSS |
| Components | shadcn/ui (or similar accessible component set) |
| Validation | Zod for all external input and environment variables |

## AWS Services

| Service | Purpose |
|---|---|
| Amplify Hosting | Git-based Next.js deployment |
| Bedrock Knowledge Bases | Managed RAG over approved sources |
| Bedrock Guardrails | Content filtering, sensitive-info masking |
| S3 | Private storage for approved source documents |
| OpenSearch Serverless | Vector index managed via Bedrock KB |
| Cognito | Auth for ambassador and admin roles |
| DynamoDB | Conversations, feedback, analytics, unanswered questions |
| CloudWatch | Application logs and metrics |

## Key Environment Variables

Defined in `.env.example`. Never commit real values.

```
AWS_REGION
BEDROCK_MODEL_ID           # do not hard-code — always use this var
BEDROCK_KNOWLEDGE_BASE_ID
BEDROCK_GUARDRAIL_ID
BEDROCK_GUARDRAIL_VERSION
COGNITO_USER_POOL_ID
COGNITO_CLIENT_ID
COGNITO_DOMAIN
DYNAMODB_TABLE_NAME
CHAT_MAX_INPUT_CHARS
ENABLE_ADMIN_SOURCE_SYNC
```

## Common Commands

```bash
npm run dev          # local development server
npm run build        # production build
npm run lint         # ESLint
npm run typecheck    # tsc --noEmit
npm test             # run tests
```

Before marking any task done, run:

```bash
npm run lint && npm run typecheck && npm test && npm run build
```

## Coding Rules

- Prefer server components; use `"use client"` only when interactivity requires it.
- Keep all AWS SDK calls in server components, route handlers, or server actions — never in client components.
- Validate every API route input with Zod before processing.
- Verify Cognito JWTs server-side; never trust a `role` field from the request body.
- Rate-limit public `/api/chat` and `/` routes.
- Do not log raw user prompts — log redacted/minimized data only.
