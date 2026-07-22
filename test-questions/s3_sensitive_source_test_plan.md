# Lemoore College Student Services Chatbot — S3 Sensitive Source Test Question Set
**AI Cyber Camp (DxHub, Cal Poly) — Chatbot QA Plan (Customer-Provided Documents)**

Architecture under test: AWS Bedrock Knowledge Base (RAG) over customer-provided documents from S3 bucket

## How to use this
For each question, run it against the bot, then score the response against the **Good** and **Bad** criteria. Note whether the bot cited/pointed to a source, gave a phone number/office, or hallucinated a policy detail. Flag anything in the "Bad" column immediately — those are RAG failure modes (hallucination, stale/wrong source, no grounding) more than tone issues.

Legend: 🔵 = Core topic question (6 of 10) 🟣 = Supplemental/stress-test question (4 of 10)

---

## Section A — Core Topic Questions (6)

### 1. 🔵 Financial aid disbursement timing and late-start courses
**Q1: "When will my financial aid be paid out, and will it cover my late-start class that begins in October?"**
- ✅ Good: Explains that Pell Grants disburse in two installments per semester (per Award Notice Email.html), notes that late-start units are included once those courses begin, and directs student to check the Disbursement Calendar. Mentions makeup disbursement dates exist for students who register late.
- ❌ Bad: Gives a single specific disbursement date without mentioning the two-installment structure, claims late-start classes are never covered by financial aid, or fails to mention the student should check the Disbursement Calendar for their specific course timing.

### 2. 🔵 Direct deposit setup and payment method
**Q2: "How do I make sure my financial aid goes into my bank account instead of getting mailed as a check?"**
- ✅ Good: Instructs student to enroll in direct deposit through the student portal (per Award Notice Email.html), explains new students must enroll and returning students only need to re-enroll if banking info changed, mentions checks are mailed to local address on record if direct deposit isn't set up, and notes mailed checks can take up to two weeks.
- ❌ Bad: Claims direct deposit is automatic with no enrollment needed, provides wrong portal path or URL not mentioned in source documents, or doesn't mention the alternative check-mailing process at all.

### 3. 🔵 Course applicability to financial aid and degree requirements
**Q3: "Will I get financial aid for all my classes, or just some of them?"**
- ✅ Good: Explains that students only receive payments for courses that apply to their declared degree or certificate program, plus elective units for degree programs to reach required units (per Award Notice Email.html), and strongly recommends meeting with a counselor to create a Student Education Plan to ensure only necessary classes are taken.
- ❌ Bad: Says all registered classes are automatically covered by financial aid regardless of degree applicability, doesn't mention the importance of having a Student Education Plan, or claims a specific unit count threshold without referencing degree applicability.

### 4. 🔵 Satisfactory Academic Progress (SAP) denial and appeal process
**Q4: "I got an email saying I'm on Financial Aid Denial status. What does that mean and can I appeal it?"**
- ✅ Good: Explains SAP Denial means the student didn't meet progress standards (cumulative GPA below 2.0 and/or completed fewer than 67% of attempted units) for two consecutive semesters (per SAP Denial Email.html), notes they can still receive California College Promise Grant if otherwise qualified but not other federal/state aid, and explains the appeal process through the financial aid forms system requires supporting documentation and a current Educational Plan from a counselor. Mentions the alternative "Request a Review of Academic Progress" if they met standards in the most recent semester.
- ❌ Bad: Claims SAP Denial is permanent with no appeal option, doesn't distinguish between different types of financial aid (some may still be available), provides generic appeal instructions without mentioning the required Educational Plan and documentation, or fails to mention the appeal deadline enforcement.

### 5. 🔵 Missing financial aid documents notification
**Q5: "I got an email saying I need to submit documents for my financial aid. Where do I submit them and what happens next?"**
- ✅ Good: Directs student to the financial aid forms system (per FAFSA Docs Needed Email.html), notes they'll need their Social Security Number or Dream Act ID to register if it's their first time, explains they'll receive a text message after submission indicating if more info is needed or if they'll get an award notice, and provides Financial Aid Office contact info for questions.
- ❌ Bad: Tells student to email documents directly without mentioning the forms system, claims documents can be submitted through a different portal not mentioned in source documents, or doesn't explain what happens after submission.

### 6. 🔵 Graduation petition eligibility and deadline
**Q6: "How do I know if I'm ready to petition to graduate, and when is the deadline?"**
- ✅ Good: Explains eligibility criteria from Petition to Graduate.pdf: need 60 degree-applicable units (either all at WHCCD or combination with other regionally accredited institutions), at least 12 units completed at WHCCD, and 2.0 cumulative GPA or higher in good academic standing. Provides the petition portal link and mentions deadline varies by term (example given was October 15 for Fall 2025). Directs to Admissions office for questions.
- ❌ Bad: Gives only a unit count without mentioning GPA requirement or WHCCD-specific unit minimum, provides a hard-coded deadline without noting it varies by term, or claims students can petition at any time with no deadline.

---

## Section B — Supplemental / Stress-Test Questions (4)

### 7. 🟣 Diploma mailing timeline post-degree posting
**Q7: "I just got an email that my degree was posted to my transcript. When will I actually get my diploma in the mail?"**
- ✅ Good: States diplomas are sent out in mid-August (per Degree Awarded.docx), acknowledges the degree posting notification is separate from diploma mailing, and provides Admissions & Records contact info for questions.
- ❌ Bad: Claims diplomas are mailed immediately upon degree posting, gives a different month or timeline not supported by source documents, or doesn't distinguish between transcript posting and physical diploma delivery.

### 8. 🟣 Transcript ordering for transfer purposes
**Q8: "I need to send my transcript to a university. How do I order an official transcript?"**
- ✅ Good: Directs student to order through Parchment (per Degree Awarded.docx), mentions universities typically require official transcripts showing posted degrees for transfer, and may note students should verify all degrees/certificates are posted to their transcript in the student portal first.
- ❌ Bad: Provides a different transcript ordering system or URL not mentioned in source documents, claims transcripts can only be ordered in person or by mail, or doesn't mention Parchment at all.

### 9. 🟣 Veterans Resource Center services and location
**Q9: "I'm a veteran student. Does Lemoore have any resources specifically for military students, and where are they located?"**
- ✅ Good: Describes the Veterans Resource Center located in Room 274 (per Dear Student.docx), lists available services (study space, tutoring, computers, supplies, complimentary drinks/snacks, mental health counseling sign-up, activities/field trips), notes it's for Active Duty, Veterans, and Military Dependent students, and mentions students should sign in/out with their Lemoore College ID number.
- ❌ Bad: Claims there are no veteran-specific resources, provides wrong room number or building, doesn't mention the sign-in requirement, or confuses it with general student services rather than the dedicated Veterans Resource Center.

### 10. 🟣 Financial aid enrollment status and award adjustments
**Q10: "My award letter shows a certain amount, but I'm only taking 9 units this semester instead of 12. Will my financial aid amount change?"**
- ✅ Good: Confirms yes — all award amounts shown in the offer letter are based on full-time enrollment status (12+ units), and awards will be adjusted if enrolling in fewer than 12 units (per Award Notice Email.html). May note the adjustment is automatic based on actual enrollment.
- ❌ Bad: Claims the award amount won't change regardless of units taken, doesn't mention the full-time enrollment assumption in award letters, or gives a specific dollar amount adjustment not supported by source documents.

---

## Scoring rubric summary (apply to every question)

| Dimension | Good response | Bad response |
|---|---|---|
| **Grounding** | Answer traceable to specific S3 source documents; no invented facts | States policies, dates, or procedures not present in any source file |
| **Completeness** | Addresses all parts of multi-part questions; provides actionable next steps | Silently drops part of a question or gives vague "contact the college" without specifics |
| **Accuracy** | Correctly distinguishes between similar policies (e.g., SAP appeal vs. review request) | Confuses different processes, offices, or requirements from different documents |
| **Source citation** | References or links to the appropriate system/portal mentioned in source docs | Invents URLs, portal names, or office names not found in source documents |
| **Tone appropriateness** | Maintains helpful, supportive tone even for stressful topics (SAP denial, missing docs) | Overly bureaucratic or dismissive when student expresses concern or confusion |

---

## Content Quality Flags and Knowledge Base Gaps

### ⚠️ Potential Ambiguities or Contradictions
1. **Appeal deadline specificity**: The SAP Denial Email mentions "July 15th" as the summer term appeal deadline but also states this deadline is "strictly enforced" without explaining what happens for Fall/Spring appeals. The chatbot may need additional documentation to handle term-specific deadline questions for non-summer periods.

2. **Petition deadline variability**: The Petition to Graduate PDF shows "October 15 for Fall 2025" as an example, but doesn't provide Spring or Summer deadlines. Students asking about other terms will get incomplete information unless supplementary deadline data is added to the knowledge base.

3. **Multiple email addresses**: Different documents use slightly different email formats for Financial Aid Office:
   - "financialaidlemoore@whccd.edu" (Award Notice Email)
   - "lemoorefinancialaid@whccd.edu" (FAFSA Docs Needed Email, SAP Denial Email)
   
   Both may be valid, but the inconsistency could cause RAG retrieval confusion about which is current/correct.

4. **Direct deposit re-enrollment clarity**: The Award Notice Email states "returning students only need to re-enroll for direct deposit if their banking information has changed," but doesn't explain how students verify if their current info is on file or how to check their enrollment status.

### 📋 Topics Well-Covered by This Source
- Financial aid disbursement mechanics and payment methods
- SAP denial and appeal processes with specific criteria
- Graduation petition requirements and self-assessment
- Veterans Resource Center services and location
- Degree posting and transcript ordering
- Course applicability to financial aid based on declared programs

### 🚫 Out-of-Scope Content Identified
- **challenge_overview.md**: This is internal project documentation, not student-facing content. Should be excluded from the knowledge base entirely or clearly marked as internal-only to prevent the chatbot from citing it in student responses.

### ✅ No Sensitive PII Found
All documents reviewed contained template placeholders (e.g., "{First Name}", "(Student ID: )") rather than actual student identifiers. No names, real student IDs, email addresses, or case-specific details were present that would require redaction.

---

## Sources Used
The following files from the customer-provided S3 location were analyzed to generate these test questions:

1. Award Notice Email.html
2. FAFSA Docs Needed Email.html
3. SAP Denial Email.html
4. Dear Student.docx
5. Degree Awarded.docx
6. Petition to Graduate.pdf
7. Helpful Links.docx

**Files excluded from test question generation:**
- FAQ.docx (contained only external URLs, no substantive content)
- challenge_overview.md (internal project documentation, not student-facing)

---

## Notes for QA Team
- These questions cover policies and procedures that extend or add detail to the core topics already tested (financial aid, registration, counseling), with particular focus on **edge cases and consequences** (SAP denial, award adjustments, appeal processes) that are critical failure points for student trust.
- The SAP denial appeal process (Q4) and course applicability to financial aid (Q3) are the highest-risk hallucination zones — these involve multi-step procedures with specific documentation requirements that a RAG system could easily misstate or oversimplify.
- Q10 tests whether the bot correctly interprets award letter amounts as **conditional** on enrollment status, which is a common source of student confusion and complaints if communicated incorrectly.
- Contact information in these documents is consistent with previously documented numbers: Financial Aid Office (559) 925-3310, Admissions & Records (559) 925-3317. Spot-check these remain current.
- The Veterans Resource Center content (Q9) represents a **new topic area** not covered in previous test sets — this expands the bot's scope beyond core academic services into student support resources.
