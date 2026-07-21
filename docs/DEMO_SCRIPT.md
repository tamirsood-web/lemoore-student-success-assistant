# Demo Script

Target length: 3–5 minutes.

## 1. Problem

“Lemoore College staff cannot always answer every call, students may reach voicemail, and important information is scattered across webpages, emails, and schedules. This is especially difficult outside 8-to-5 hours and for adult learners.”

## 2. Student Question

Open the public mobile-friendly assistant.

Ask a question that is well represented in the knowledge base.

Show:

- concise answer,
- official citation,
- source opening,
- suggested follow-up,
- helpful feedback.

## 3. Deadline Intelligence

Ask for a class-specific census or drop date.

Show that the assistant requires the correct course/section information and cites the exact source rather than guessing from a generic calendar.

## 4. Safe Failure

Ask an unsupported or private question, such as:

“Can you check whether my financial aid was approved?”

Show:

- no fabricated access,
- privacy-safe explanation,
- correct department escalation.

## 5. Ambassador Mode

Sign in as a student ambassador.

Show:

- answer lookup,
- department context,
- copy-answer button,
- escalation instructions.

Explain that ambassadors can resolve more calls without receiving access to private student records.

## 6. Staff Insight

Open the admin dashboard.

Show:

- question volume,
- common categories,
- helpful rate,
- unanswered questions.

Explain that the college can improve communications based on real demand.

## 7. AWS Architecture

Briefly explain:

- Amplify hosts the Next.js experience.
- Bedrock generates answers.
- Bedrock Knowledge Bases grounds responses in approved S3 documents through vector retrieval.
- Cognito separates ambassador/admin access.
- DynamoDB records minimized feedback and analytics.
- Guardrails and application rules reduce unsafe or sensitive responses.

## Closing

“This gives students immediate access to verified information, helps ambassadors resolve more questions, and shows staff where students are still getting stuck—without requiring private student-system access for the MVP.”
