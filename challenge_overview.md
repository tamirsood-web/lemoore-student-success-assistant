# Challenge Overview: LC Call Center — AI-Powered Knowledgebase for Instant, 24/7 Student Question Answering

## Project Objectives
- Deliver accurate, consistent, immediate answers to common student inquiries without relying on staff availability
- Enable student self-service and augment student ambassadors with fast information retrieval across scattered sources
- Improve experience for current and prospective students — especially non-traditional/adult learners and those in different time zones needing after-hours support
- Reduce call wait times, decrease volume of repetitive inquiries handled by staff, and raise first-contact resolution and student satisfaction
- Leave room to grow into an omni-channel model (phone + web chat) and escalation/hand-off to staff for complex cases

## Current Workflow
- Answers live primarily on public-facing websites (Financial Aid, Admissions & Records), FAQ pages, shared drives, PDFs/forms, and an Ed Services census/drop-date spreadsheet
- Students call direct lines to financial aid, admissions and records, counseling; staff manually search multiple systems, websites, and documents
- Users find answers by phoning staff or student ambassadors during 8–5 business hours, or leaving voicemails
- Manual artifacts maintained on the side — FAQ pages, a spreadsheet of class census/drop dates, proactive outreach emails
- Legacy tooling includes phone-based call center, email/ticketing, and a basic existing website bot that does not learn and is largely unused

## Key Pain Points
- Information exists and is up to date but is spread across sites; students and ambassadors struggle to locate it
- Student ambassadors often lack knowledge or system access, bouncing students between offices
- Time cost of searching, sending links, and returning voicemails; calls go unanswered outside 8–5 and during peak periods
- High volume of repetitive, publicly-answerable questions (deadlines, forms, census dates, degree posting) that could be self-served
- Platform constraints — restricted access to personal data, no funding for expensive systems, and an ineffective existing bot

## Ideal Solution Vision
- Web chat assistant (starting point) grounded in a knowledge base, available 24/7 — addresses after-hours and repetitive-inquiry pain points
- Example: a student asks where to find a required form or their census/drop date, and the assistant returns the answer with a direct link to the source page
- Index and cite official public web content, FAQs, forms, and proactive-email guidance, returning source links to reduce staff hand-offs
- Optional surface area — embedded chat window on the website or a standalone chatbot page; shortcuts to top-use-case questions
- Extension path — expand to omni-channel (phone/voice) and add staff escalation without a rewrite

## Data Availability
- Primary source of truth — public-facing college website (Financial Aid, Admissions & Records, FAQs); teams may crawl/scrape absent bulk data (check robots.txt); IT can be looped in optionally
- Supplementary datasets — top 10 most frequent questions with links to answering pages, sample proactive outreach emails, census/drop-date spreadsheet, public forms
- Human resources — MESA and student services staff for validation, student ambassadors, student testers for usability feedback
- Known gaps or restricted data — no sample/synthetic data currently provided; student portal/PII behind single sign-on is out of scope; optional URL map not required

> **Note:** Data must be sourced from existing public website content and supplementary materials to be provided; no new collection required beyond the top-10 questions and email samples called out above.