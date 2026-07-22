# Amazon Bedrock Knowledge Base Integration (Deployment & Setup)

This describes the manual AWS steps to run the app in **bedrock** mode. The application does
**not** create, modify, or delete any AWS resource, IAM policy, or Knowledge Base — all AWS
setup below is performed manually by an operator.

> Prototype demo — not the official Lemoore College website.

## Provider modes

`RAG_PROVIDER` selects the backend:

- `local` (default) — offline official-source corpus; used by tests and offline dev.
- `bedrock` — live Amazon Bedrock Knowledge Base via `RetrieveAndGenerate`.

Both the AI website search and the floating Student Assistant use the **same** shared
server-side provider (`getSearchProvider()`), so switching modes changes no UI code. In
bedrock mode the app never silently falls back to local answers: a config or service problem
returns a safe *service-unavailable* response.

## Knowledge Base type

Set `BEDROCK_KB_TYPE`:

- `vector` — standard/customer-managed **VECTOR** KB. This is the only type that uses
  `RetrieveAndGenerate` here.
- `managed` — the app does **not** call `RetrieveAndGenerate`; configuration validation fails
  with an internal explanation and the public response is a safe *service-unavailable*
  message. A different managed-KB retrieval implementation would be required.

Do not guess the type — confirm it in the Bedrock console before setting this value.

## Required environment variables (server-only)

| Variable | Example / format | Notes |
| --- | --- | --- |
| `RAG_PROVIDER` | `bedrock` | `local` \| `bedrock` |
| `BEDROCK_KB_TYPE` | `vector` | `vector` \| `managed` |
| `AWS_REGION` | `us-west-2` | KB's region |
| `BEDROCK_KNOWLEDGE_BASE_ID` | 10-char id, e.g. `ABCDEF1234` | validated shape |
| `BEDROCK_MODEL_ARN` | foundation-model or inference-profile ARN | validated shape |
| `BEDROCK_NUMBER_OF_RESULTS` | `8` | integer 1–20 |
| `BEDROCK_REQUEST_TIMEOUT_MS` | `15000` | 1000–60000 |

Placeholders are in `.env.example`. Put real values only in `.env.local` (gitignored) or the
deployment environment. **Never** commit real values, and never expose any of these via
`NEXT_PUBLIC_*`. Credentials come from the **AWS default credential provider chain** — never
hard-coded.

## IAM (apply manually — the app never edits IAM)

Minimum permission to call RetrieveAndGenerate:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "BedrockRetrieveAndGenerate",
      "Effect": "Allow",
      "Action": ["bedrock:RetrieveAndGenerate", "bedrock:Retrieve"],
      "Resource": "arn:aws:bedrock:<region>:<account-id>:knowledge-base/<kb-id>"
    },
    {
      "Sid": "BedrockInvokeModel",
      "Effect": "Allow",
      "Action": ["bedrock:InvokeModel"],
      "Resource": "<model-or-inference-profile-arn>"
    }
  ]
}
```

- **Model access**: request/enable access to the Claude Sonnet model in the Bedrock console
  (Model access) in the same region as the KB.
- **Local dev**: use the AWS CLI credential chain (`aws configure` / SSO / `AWS_PROFILE`).
  Do not paste keys into the repo.
- **Deployed environments**: attach the policy above to the app's **IAM execution role**
  (e.g. the Amplify/ECS/Lambda role). No static keys.

## Finding the values in the console

- **KB ID**: Bedrock → Knowledge bases → your KB → *Knowledge base ID*.
- **Region**: the region selector while viewing the KB (must match `AWS_REGION`).
- **Model / inference-profile ARN**: Bedrock → Model access / Inference profiles → copy ARN.
- **KB ACTIVE**: KB status shows *Available/Active*.
- **Data source synced**: Data source → last sync *Completed*. Re-sync after ingesting docs.

## Required source metadata → official citation links

The app builds a public "Open official source" link **only** from an approved-domain HTTPS URL
found in a retrieved reference's metadata (or an approved `webLocation.url`). Recommended
metadata on each ingested document:

```json
{
  "source_url": "https://lemoorecollege.edu/...",
  "page_title": "Official page title",
  "department": "Department name",
  "source_type": "official-web-page"
}
```

Recognized URL fields (in priority order): `canonical_url`/`canonicalUrl` →
`source_url`/`sourceUrl` → `url` → `page_url`/`pageUrl` → Bedrock `webLocation.url`. A URL is
shown only if it parses, is HTTPS, and its host is an approved domain (`lemoorecollege.edu`,
`westhillscollege.com`, `whccd.edu`, and approved subdomains). S3 URIs, ARNs, bucket names,
KB IDs, account IDs, and console URLs are never shown.

> **Important:** If the Knowledge Base returns only an S3 location and no official
> source-URL metadata, the application **cannot** safely create the original college webpage
> link. It will still show the verified title + excerpt labeled "Official source document,"
> but the document must be **re-ingested with correct `source_url` metadata** rather than
> having the app guess a link.

## Live verification

```bash
npm run verify:bedrock
```

Server-only, manually run. It performs **live, paid** Bedrock requests using the real
configured provider, runs 8 representative queries, and prints only safe fields (status,
citation count, source titles, approved URLs, duration). It never runs during `npm test` or
`npm build`, exits non-zero if configuration is missing, and exits non-zero if every query
fails.

## Errors → safe public responses

All AWS failures (access denied, resource not found, validation, throttling, quota, timeout,
network, dependency, guardrail intervention, empty output/citations) are normalized to a
single safe public message:

> "The student information service is temporarily unavailable. Please try again shortly or
> use the official Lemoore College website."

Internal logs contain only a correlation id, provider name, safe error category, and duration
— never the question, answer, excerpts, KB id, model ARN, account id, credentials, or session.

## Not done in this task (remaining manual/AWS work)

- Enabling model access + creating/syncing the KB and its data source (console).
- Attaching the IAM policy to the deployment role.
- Optional Bedrock **conversation sessions** for the assistant (see below) — not implemented.
- Deployment and any voice features — explicitly out of scope.
