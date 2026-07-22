# Integration Seams: Local Mock → AWS

This prototype runs entirely on local, deterministic mock data. Every place a managed AWS
service will eventually attach is expressed as a **typed seam** so adopting the service is an
implementation swap, not a rewrite. Nothing in this repo calls AWS, uses credentials, or
deploys anything.

The rule that makes this work: **the UI depends only on seam interfaces, never on a concrete
implementation.** The chat UI, the search UI, and the `POST /api/chat` contract do not know
which backend answers them.

---

## 1. Website search — `SearchProvider` → Amazon Bedrock Knowledge Base

| Layer | Local (today) | AWS (later) |
| --- | --- | --- |
| Interface | `SearchProvider` (`src/types/search.ts`) | same interface |
| Implementation | `createLocalSearchProvider()` (`src/lib/search/localSearchProvider.ts`) | a Knowledge Base–backed provider |
| Façade | `searchService` (`src/lib/search/searchService.ts`) | unchanged |
| UI | `SearchInput` / `SearchResults` / `SearchModal` / `SearchExperience` | unchanged |

**Swap:** implement `SearchProvider.search()` to call the Bedrock Knowledge Base
(`Retrieve`) and map hits to `SearchResult[]`, then construct `searchService` with that
provider instead of the local one. No UI file changes.

```ts
// src/lib/search/searchService.ts (future)
export const searchService = createSearchService(createKnowledgeBaseSearchProvider());
```

Because a KB provider is just a `SearchProvider` (`KnowledgeBaseSearchProvider` alias in
`src/types/integrations.ts`), the search box gains true semantic recall with zero UI churn.

---

## 2. Grounded chat (RAG) — `RetrieveFn` → Knowledge Base `RetrieveAndGenerate`

The server flow (`src/app/api/chat/route.ts`) is: `screen → retrieve → compose →
applyEscalationRules → toAssistantResponse`. Only the **retrieve** step is backend-specific.

| Layer | Local (today) | AWS (later) |
| --- | --- | --- |
| Interface | `RetrieveFn` / `RetrievalService` (`src/types/services.ts`); `KnowledgeBaseRetriever` (`src/types/integrations.ts`) | same |
| Implementation | `retrieve()` (`src/lib/bedrock/retrieve.ts`) reads mock sources | `retrieve()` calls Bedrock KB and normalizes to `RetrievalResult` |
| Model | n/a (answer is composed verbatim from excerpts) | Amazon Bedrock foundation model via `FoundationModelClient` (`BEDROCK_MODEL_ID`) |

**Swap:** reimplement `retrieve()` to call `bedrock-agent-runtime` and normalize citations to
the existing `RetrievalResult` shape at the server boundary (AGENTS.md §9). The escalation
rules, citation integrity checks, guardrail, and UI are untouched.

Guardrails: `screen()` (`src/lib/bedrock/guardrail.ts`) is the application-level check today
and remains in place; Amazon Bedrock Guardrails supplements it, it does not replace it.

---

## 3. Document ingestion — `DocumentIngestionService` → S3 + KB sync

`DocumentIngestionService` (`src/types/integrations.ts`) describes registering an approved
document and triggering a knowledge-base sync.

- **Target:** private Amazon S3 bucket for approved sources + a Bedrock Knowledge Base data
  source that indexes the bucket into Amazon OpenSearch Serverless.
- **Constraint:** never ingest private student records (AGENTS.md §13). Course-date data
  keeps its structured fields for exact matching (ARCHITECTURE.md → Course-Date Handling).

`VectorSearchClient` is exposed for diagnostics only; the normal retrieval path is the
managed `KnowledgeBaseRetriever`.

---

## 4. Voice — STT/TTS/telephony seams (no telephony implemented)

A voice turn is just `audio-in → text → the existing grounded pipeline → text → audio-out`.
The seams live in `src/types/voice.ts`:

| Seam | Target AWS service | Notes |
| --- | --- | --- |
| `SpeechToTextProvider.transcribe()` | **Amazon Transcribe** | transcript is treated as untrusted user input; flows through the same guardrail/retrieval path |
| `TextToSpeechProvider.synthesize()` | **Amazon Polly** | only grounded, safety-checked answer text is synthesized — never system prompts/context |
| `VoiceConversationService` | **Amazon Connect** (telephony bridge) | orchestrates one turn end-to-end; reuses `POST /api/chat`, no new answer contract |
| `VoiceSession` / `VoiceTurn` | — | holds only what a chat conversation holds; stores no raw audio or extra sensitive data |

**Why the UI never changes:** `VoiceConversationService.handleTurn()` calls the same grounded
answer pipeline the chat UI calls. Adding voice adds a new *channel*, not a new *contract*.

---

## Summary

| Concern | Seam | Local impl | AWS target |
| --- | --- | --- | --- |
| Website search | `SearchProvider` | `localSearchProvider` | Bedrock Knowledge Base |
| Chat retrieval | `RetrieveFn` / `KnowledgeBaseRetriever` | `retrieve()` (mock) | Bedrock KB `RetrieveAndGenerate` |
| Inference | `FoundationModelClient` | n/a (verbatim compose) | Bedrock model (`BEDROCK_MODEL_ID`) |
| Ingestion | `DocumentIngestionService` | n/a | S3 + KB sync |
| Vector search | `VectorSearchClient` | n/a | OpenSearch Serverless |
| Speech-to-text | `SpeechToTextProvider` | n/a | Amazon Transcribe |
| Text-to-speech | `TextToSpeechProvider` | n/a | Amazon Polly |
| Telephony | `VoiceConversationService` | n/a | Amazon Connect |

Adopting any row means implementing its seam and constructing the service with the new
implementation. The components, pages, and API contract stay as they are.
