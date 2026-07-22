# Kiro Task: Generate Test Questions from Sensitive S3 Customer Documents

**Project:** Lemoore College Student Services Chatbot (AI Cyber Camp, DxHub / Cal Poly)
**Recommended model:** Claude Opus 4.8 (or Sonnet 5 if conserving credits)
**Session type:** New Kiro session — sensitive data handling

---

## Before you start this session

- [ ] Confirm AWS credentials are configured and scoped to **read-only** access on this
      bucket only (prefer short-lived/session credentials via `aws-vault` or SSO over
      long-lived access keys, given this data is non-public)
- [ ] Fill in the bucket name/prefix placeholder below
- [ ] Confirm with your team/customer contact that it's okay for an AI agent to read and
      summarize this data into test questions
- [ ] Plan to review Kiro's output before it's saved anywhere outside your local machine
      or a private, access-controlled team location

---

## Context for Kiro

Our team is building a chatbot for Lemoore College Student Services using AWS Bedrock
Knowledge Base RAG. I'm the QA lead testing the chatbot. We already have test question
sets covering our original 5 core topics and a set drawn from customer documents in our
GitHub repo. This session is for a **separate, sensitive source**: customer-provided
documents stored in an S3 bucket that are **not public** and must be handled carefully.

## Source location

```
<<insert s3 bucket location>>
```

Use `aws s3 ls <<insert s3 bucket location>>` first to see what's there before
reading anything.

## Sensitivity rules — follow these strictly

1. **Read-only.** Only list and read objects in this bucket. Never write, delete, move,
   or modify anything in the bucket itself.
2. **No verbatim reproduction.** When generating questions and grading criteria, do NOT
   quote sensitive material verbatim. Paraphrase and describe policies/facts in your own
   words. Cite the source filename (e.g., "per `internal-financial-aid-policy.pdf`")
   rather than reproducing its text.
3. **No local copies persisted.** If you need to download an object to read it, treat it
   as temporary — do not write raw file contents from this bucket into any file that gets
   committed to a repo or saved outside a temp/working location. Only the generated
   questions/rubric output should be saved as a persistent file.
4. **Redact identifiers.** If any document contains names, student IDs, email addresses,
   case numbers, or other personally identifiable information, do not include those
   specifics in your output at all — describe the type of policy/scenario generically
   instead (e.g., "a documented medical emergency" rather than any real example detail).
5. **Flag anything that seems out of scope.** If a document looks like it contains data
   that shouldn't be used for chatbot test question generation at all (e.g., raw student
   records, disciplinary files, anything clearly not a policy/FAQ-type document), stop and
   tell me instead of processing it further.

## Task

1. List and read the documents in the S3 location above. List each object/filename you
   used (filenames only — not sensitive content).
2. Identify topics, policies, and frequently-asked questions that appear in these
   documents. Topics may overlap with previously covered ones (counseling, student
   agreements, dropping classes, financial aid) if this source adds new detail, nuance,
   or edge cases — or may be entirely new topics found only in this source.
3. Generate **10 test questions** for the chatbot. For each one, include:
   - The question text, phrased the way a real student would actually ask it
   - **Good response criteria**: what a correct, grounded answer must include, citing the
     source filename (not quoted content) that supports it
   - **Bad response criteria**: specific, plausible failure modes for this question —
     e.g., a fact not actually present in the source docs, confusion with a similar policy
     from a different document, a wrong contact/office, a missing required step, or a
     contradiction with another document in this or a prior source
4. Flag any document or topic where content is ambiguous, contradictory, outdated, or
   incomplete — this indicates a knowledge base gap that will surface as bot inconsistency
   regardless of retrieval quality.
5. Output the result as a markdown file in /test-questions folder, structured like our existing test plans in that same folder (numbered question list + rubric table), with a final "Sources used" section listing filenames only (no bucket path with account-identifying info, no file contents).

## Ground rules

- Do not guess or fill gaps with general knowledge if the documents don't cover something
  — say so explicitly instead of inventing an answer.
- Every factual claim in a "Good response" criterion must trace back to a specific file
  in this S3 location, referenced by filename only.
- If in doubt about whether something is sensitive enough to exclude from your output,
  exclude it and flag it for me to review instead of including it.
