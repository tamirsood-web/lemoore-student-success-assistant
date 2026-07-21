# Architecture

## Recommended Architecture

```text
Browser
  |
  v
AWS Amplify Hosting
Next.js App Router
  |
  +--> Public student UI
  +--> Cognito-authenticated ambassador/admin UI
  +--> Server route handlers / server actions
          |
          +--> Amazon Bedrock Knowledge Bases
          |       |
          |       +--> S3 approved documents
          |       +--> OpenSearch Serverless vector index
          |       +--> Bedrock foundation model
          |
          +--> Bedrock Guardrails
          |
          +--> DynamoDB
          |       +--> feedback
          |       +--> redacted analytics
          |       +--> unanswered questions
          |
          +--> CloudWatch logs/metrics
```

## Why This Stack

### Next.js + TypeScript

One codebase supports the public UI, authenticated workspaces, and server-side AWS integration. This reduces integration overhead during the hackathon.

### Amplify Hosting

Provides Git-based deployment for Next.js and keeps the project visibly AWS-native without requiring the team to manage servers.

### Bedrock Knowledge Bases

Provides managed retrieval-augmented generation over approved institutional sources. It reduces the custom ingestion, embedding, retrieval, and citation code the team would otherwise need to build.

### S3

Private storage for approved source files and normalized course-date data.

### OpenSearch Serverless

Managed vector search used by the knowledge base. Prefer allowing the Bedrock setup workflow to create/configure it for the hackathon.

### Cognito

Authentication and role groups:

- `ambassadors`
- `admins`

Public student chat remains unauthenticated. Do not require a student account for the core flow.

### DynamoDB

Stores low-volume application events and feedback without requiring relational database setup. Avoid storing raw sensitive content.

### Bedrock Guardrails

Adds configurable filtering and sensitive-information handling. Guardrails supplement, but do not replace, application-level validation and authorization.

## Model Choice

Use a Bedrock-supported conversational model that is enabled in the team AWS region and account.

Decision criteria:

1. Reliable instruction following
2. Good concise answer quality
3. Low latency
4. Cost suitable for a demo
5. Compatibility with the chosen Knowledge Bases retrieve-and-generate flow

Do not hard-code the model ID throughout the app. Use `BEDROCK_MODEL_ID`.

## Core Server Flow

1. Validate the request.
2. Redact or reject obvious sensitive identifiers.
3. Determine mode from verified authentication, never from client input alone.
4. Call the Bedrock Knowledge Base retrieve-and-generate API.
5. Apply the configured guardrail where supported.
6. Normalize answer and citation output.
7. Apply deterministic escalation rules.
8. Store only minimized analytics and feedback data.
9. Return a typed response.

## Suggested API Routes

```text
POST /api/chat
POST /api/feedback
GET  /api/admin/analytics
POST /api/admin/sources/sync
GET  /api/health
```

Do not create many micro-endpoints unless needed.

## Authentication

- Public `/` and `/api/chat` may be used anonymously with rate limiting.
- `/ambassador/*` requires a valid Cognito user in `ambassadors` or `admins`.
- `/admin/*` requires a valid Cognito user in `admins`.
- Verify JWTs server-side.
- Never trust a `role` value sent in request JSON.

## Knowledge Sources

Start with a deliberately small, high-quality corpus. A polished demo with 10–30 approved sources is better than a large noisy crawl.

Suggested initial categories:

- Admissions and records
- Financial aid general FAQs
- Counseling and registration
- Academic calendar
- Degree posting/transcript information
- Census/drop-date dataset
- Office contact and hours
- Common student services

## Course-Date Handling

Course dates are high-risk because starts and deadlines vary.

Recommended hackathon path:

1. Convert the approved spreadsheet into a normalized CSV or JSON file.
2. Include term, subject, catalog number, section, start date, census date, withdrawal/drop date, and source metadata.
3. Ingest the normalized file into the knowledge base.
4. Require the student to provide enough identifiers for an exact match.
5. Return the matching row citation or escalate.

Do not answer “What is my drop date?” from a generic calendar alone.

## Cost and Scope Controls

- Keep the corpus small.
- Avoid agents and tool orchestration unless clearly needed.
- Use one knowledge base.
- Use one vector collection.
- Store aggregate analytics.
- Apply basic anonymous rate limiting.
- Keep generated responses concise.
- Avoid provisioning duplicate staging environments during the hackathon.

## Failure Modes

### No Retrieval Results

Return a no-verification fallback and department escalation.

### Bedrock Failure

Show a friendly temporary-error state with official contact options.

### Missing Citation

Treat the response as low confidence and do not present it as verified.

### Authentication Failure

Return 401/403 without revealing role details.

### Sensitive Student Data

Do not process it. Prompt the user to use the official secure channel.

## Infrastructure Strategy

Use one of these approaches:

### Fastest

Create Bedrock model access, Knowledge Base, S3 source, OpenSearch Serverless, Cognito, and DynamoDB through the AWS console. Record names/IDs in environment variables and document setup.

### Repeatable

Use AWS CDK TypeScript under `/infra`.

Do not mix incomplete CDK and undocumented console setup. Whichever approach is used, keep `docs/AWS_SETUP.md` current.
