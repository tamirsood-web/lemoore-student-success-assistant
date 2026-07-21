# MVP Backlog

Work from top to bottom. Do not begin stretch goals until all P0 items are demo-ready.

## P0 — Required

### Foundation

- [ ] Create Next.js TypeScript app
- [ ] Configure Tailwind and accessible UI components
- [ ] Add environment validation
- [ ] Add AWS SDK clients server-side
- [ ] Create health endpoint
- [ ] Add deployment to Amplify

### Knowledge Base

- [ ] Create private S3 source bucket/prefix
- [ ] Add a curated set of approved college sources
- [ ] Create Bedrock Knowledge Base
- [ ] Configure vector store
- [ ] Run initial synchronization
- [ ] Verify retrieval with test questions

### Student Chat

- [ ] Build mobile-first chat page
- [ ] Add example questions
- [ ] Implement `/api/chat`
- [ ] Normalize citations
- [ ] Render citations clearly
- [ ] Add no-source fallback
- [ ] Add suggested follow-ups
- [ ] Add loading and error states

### Safety

- [ ] Add Bedrock Guardrail
- [ ] Add application-level sensitive-data detection/rejection
- [ ] Add prompt-injection resilience instructions
- [ ] Add deterministic escalation rules
- [ ] Ensure no AWS secrets reach browser bundles

### Feedback and Analytics

- [ ] Add helpful/unhelpful controls
- [ ] Store feedback in DynamoDB
- [ ] Store minimized question category/confidence events
- [ ] Store unsupported-question events

### Ambassador

- [ ] Configure Cognito
- [ ] Create `ambassadors` and `admins` groups
- [ ] Add ambassador sign-in
- [ ] Add copy-answer action
- [ ] Display department/escalation guidance
- [ ] Verify authorization server-side

### Admin Demo

- [ ] Show total questions
- [ ] Show helpful-rate
- [ ] Show common categories
- [ ] Show unsupported questions
- [ ] Protect route and API with admin authorization

### Quality

- [ ] Run evaluation set
- [ ] Test phone viewport
- [ ] Test unsupported questions
- [ ] Test prompt injection
- [ ] Test sensitive-data request
- [ ] Ensure build passes
- [ ] Rehearse demo flow

## P1 — High Value After P0

- [ ] Staff source-upload UI
- [ ] Trigger knowledge-base synchronization
- [ ] Filter dashboard by department
- [ ] Conversation continuity
- [ ] Source freshness metadata
- [ ] Spanish-language answers while preserving source grounding
- [ ] More detailed anonymous rate limiting

## P2 — Stretch

- [ ] Voice input/output
- [ ] Voicemail transcription pipeline
- [ ] Department notification workflow
- [ ] Email or SMS follow-up
- [ ] Web crawler for approved pages
- [ ] Advanced evaluation dashboard
- [ ] Personalized student-system integration

## Suggested Team Split

### Person 1 — Student Experience

Chat UI, citations, responsive layout, feedback controls.

### Person 2 — AWS/RAG

S3, Bedrock Knowledge Base, retrieval tests, guardrails, source normalization.

### Person 3 — Auth/Admin

Cognito, role checks, ambassador experience, analytics dashboard.

### Person 4 — Integration/Quality

API contracts, DynamoDB, evaluations, error states, deployment, demo coordination.

Adjust based on team size, but assign ownership by vertical feature rather than by isolated files.
