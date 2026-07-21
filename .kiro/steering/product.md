# Product: Lemoore Student Success Assistant

An AI-powered student support assistant for Lemoore College that answers questions grounded in official college sources, with citations and safe escalation when answers cannot be verified.

## Users

- **Students (public, unauthenticated)** — ask questions in plain language, see cited answers, rate responses.
- **Student Ambassadors (authenticated)** — same assistant with operational context and copy-to-clipboard for phone support.
- **Staff/Admin (authenticated)** — dashboard showing common questions, unanswered queries, feedback stats, and source management.

## Core Behavior

- Answers come only from the approved Bedrock Knowledge Base — never invented.
- Every factual claim is cited with a title and source link.
- Low-confidence or unsupported questions escalate to the correct department instead of guessing.
- Course-specific dates (census, drop) require an exact match; a generic calendar date must never be used.

## What the MVP Must Demo

1. Student asks a question → grounded answer with citations.
2. Unsupported question → transparent fallback + department escalation.
3. Ambassador signs in → role-aware view with copy action.
4. Admin dashboard shows at least basic feedback/usage data.
5. Student rates an answer → feedback is stored.

## Non-Goals (MVP)

- No student information system integration.
- No access to grades, financial records, or protected student data.
- No autonomous actions on behalf of students.
- No voice/telephony or native mobile app.
