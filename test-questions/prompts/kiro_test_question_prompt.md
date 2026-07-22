# Kiro Task: Generate 10 Additional Chatbot Test Questions from Customer Documents

**Project:** Lemoore College Student Services Chatbot (AI Cyber Camp, DxHub / Cal Poly)
**Recommended model:** Claude Opus 4.8 (or Sonnet 5 if conserving credits)

---

## Context

Our team is building a chatbot for Lemoore College Student Services using AWS Bedrock
Knowledge Base RAG. I'm the QA lead testing the chatbot. We already have a 15-question
test set with grading rubrics covering: scheduling counseling appointments, completing a
student agreement before registering, dropping a class, applying for financial aid, and
whether financial aid must be repaid.

I now need a second set of test questions grounded specifically in the customer-provided
documents in this repo, so our test coverage reflects the actual source material the
chatbot's knowledge base will be built from — not just general community college knowledge.

## Task

1. Read every document in the repo folder **`/customer-provided-docs`**. List each file
   you used by filename.
2. Identify topics, policies, and frequently-asked questions that actually appear in these
   documents. You may cover the same general topics as our existing 15-question set
   (counseling, student agreements, dropping classes, financial aid, etc.) if the customer
   documents contain additional detail, nuance, or edge cases on those topics — you don't
   need to avoid them. You may also surface entirely new topics if the documents cover
   things outside our original five.
3. Generate exactly **10 test questions** for the chatbot. For each one, include:
   - The question text, phrased the way a real student would actually ask it (casual,
     not textbook language)
   - **Good response criteria**: what a correct, grounded answer must include, with a
     citation to the specific source document/section in `/customer-provided-docs` that
     supports it
   - **Bad response criteria**: specific, plausible failure modes for this exact question
     — e.g., stating a fact not actually present in the source docs, confusing this policy
     with a similar-sounding one from a different document, giving a wrong contact/office/
     phone number, omitting a required step, or contradicting another document in the folder
4. Flag any question where the source documents are ambiguous, contradictory, outdated, or
   incomplete. I want to know where the knowledge base itself has gaps or conflicts, since
   that will surface as chatbot inconsistency later regardless of how good the retrieval
   pipeline is.
5. Output the result as a markdown file in the /test-questions folder, structured like a test plan (numbered question
   list + a rubric table), matching the tone/format of a normal QA test doc. At the end,
   include a short "Sources used" list mapping each question number to the file(s) in
   `/customer-provided-docs` it was drawn from.

## Ground rules

- Do not guess or fill gaps with general knowledge about community colleges if the customer
  documents don't cover something for a given question — say so explicitly instead of
  inventing a plausible-sounding answer.
- Every factual claim in a "Good response" criterion must be traceable to a specific file
  in `/customer-provided-docs`. If you can't point to where it came from, don't include it.
- Prefer real, specific details (names of forms, exact office names, specific steps) over
  generic phrasing — the more specific the good/bad criteria, the more useful this is for
  grading actual bot output.
