# Lemoore retrieval three-way comparison

Generated: 2026-07-23T05:29:59.247Z

> Diagnostic only. Production retrieval uses the **combined** scope (no data-source filter).
> Knowledge Base id and data-source ids are redacted from this report.

Scopes present: combined, s3, crawler

## Usable totals by scope

| Scope | Usable / Total |
| --- | --- |
| combined | 29 / 45 |
| s3 | 42 / 45 |
| crawler | 17 / 45 |

Evaluator matching-corrected questions: 0

## Combined-scope failure classifications

| Classification | Count |
| --- | --- |
| correct-source-ranked-too-low | 13 |
| stale-source | 2 |
| crawler-noise | 1 |

## Which source performed better, by topic group

| Topic | Total | combined | s3 | crawler | Better source |
| --- | --- | --- | --- | --- | --- |
| academic-calendar | 2 | 2 | 2 | 1 | s3 |
| admissions | 2 | 2 | 2 | 2 | tie |
| basic-needs | 1 | 1 | 1 | 1 | tie |
| calworks | 1 | 1 | 1 | 1 | tie |
| campus-contact | 1 | 1 | 1 | 1 | tie |
| campus-map | 1 | 1 | 1 | 0 | s3 |
| career-services | 1 | 1 | 1 | 1 | tie |
| catalog | 1 | 1 | 1 | 0 | s3 |
| cost-of-attendance | 2 | 0 | 2 | 0 | s3 |
| counseling | 1 | 1 | 1 | 1 | tie |
| degrees-and-certificates | 2 | 0 | 2 | 0 | s3 |
| dream-resource-center | 1 | 1 | 1 | 0 | s3 |
| dsps | 1 | 1 | 1 | 0 | s3 |
| dual-enrollment | 1 | 0 | 1 | 0 | s3 |
| eops | 1 | 1 | 1 | 1 | tie |
| fafsa | 2 | 1 | 1 | 0 | s3 |
| financial-aid | 4 | 2 | 3 | 1 | s3 |
| graduation | 1 | 0 | 1 | 1 | tie |
| grants-and-scholarships | 2 | 1 | 2 | 0 | s3 |
| helpdesk | 2 | 1 | 2 | 1 | s3 |
| library | 1 | 0 | 1 | 0 | s3 |
| mental-health | 1 | 1 | 1 | 0 | s3 |
| orientation | 1 | 1 | 1 | 1 | tie |
| refunds | 1 | 0 | 1 | 0 | s3 |
| registration | 3 | 2 | 2 | 1 | s3 |
| sap | 1 | 1 | 1 | 1 | tie |
| student-portal | 1 | 1 | 1 | 1 | tie |
| transcripts | 1 | 1 | 1 | 1 | tie |
| transfer | 1 | 1 | 1 | 0 | s3 |
| tuition-and-fees | 2 | 1 | 2 | 0 | s3 |
| tutoring | 1 | 0 | 1 | 0 | s3 |
| veterans | 1 | 1 | 1 | 0 | s3 |

## Per-question results

| ID | Topic | combined | s3 | crawler | Combined rank | Origin | Combined failure |
| --- | --- | --- | --- | --- | --- | --- | --- |
| q01 | admissions | ✅ | ✅ | ✅ | #1 | s3 |  |
| q02 | registration | ✅ | ✅ | ❌ | #4 | s3 |  |
| q03 | registration | ❌ | ❌ | ❌ |  |  | stale-source |
| q04 | transcripts | ✅ | ✅ | ✅ | #1 | s3 |  |
| q05 | academic-calendar | ✅ | ✅ | ❌ | #1 | s3 |  |
| q06 | financial-aid | ❌ | ❌ | ❌ |  |  | stale-source |
| q07 | fafsa | ❌ | ❌ | ❌ |  |  | crawler-noise |
| q08 | fafsa | ✅ | ✅ | ❌ | #4 | s3 |  |
| q09 | cost-of-attendance | ❌ | ✅ | ❌ |  |  | correct-source-ranked-too-low |
| q10 | tuition-and-fees | ❌ | ✅ | ❌ |  |  | correct-source-ranked-too-low |
| q11 | grants-and-scholarships | ❌ | ✅ | ❌ |  |  | correct-source-ranked-too-low |
| q12 | refunds | ❌ | ✅ | ❌ |  |  | correct-source-ranked-too-low |
| q13 | sap | ✅ | ✅ | ✅ | #1 | s3 |  |
| q14 | financial-aid | ❌ | ✅ | ❌ |  |  | correct-source-ranked-too-low |
| q15 | financial-aid | ✅ | ✅ | ✅ | #1 | s3 |  |
| q16 | counseling | ✅ | ✅ | ✅ | #1 | s3 |  |
| q17 | tutoring | ❌ | ✅ | ❌ |  |  | correct-source-ranked-too-low |
| q18 | library | ❌ | ✅ | ❌ |  |  | correct-source-ranked-too-low |
| q19 | veterans | ✅ | ✅ | ❌ | #2 | s3 |  |
| q20 | dsps | ✅ | ✅ | ❌ | #2 | s3 |  |
| q21 | eops | ✅ | ✅ | ✅ | #1 | s3 |  |
| q22 | calworks | ✅ | ✅ | ✅ | #5 | s3 |  |
| q23 | graduation | ❌ | ✅ | ✅ |  |  | correct-source-ranked-too-low |
| q24 | student-portal | ✅ | ✅ | ✅ | #1 | crawler |  |
| q25 | helpdesk | ✅ | ✅ | ✅ | #1 | s3 |  |
| q26 | registration | ✅ | ✅ | ✅ | #1 | s3 |  |
| q27 | transfer | ✅ | ✅ | ❌ | #2 | s3 |  |
| q28 | basic-needs | ✅ | ✅ | ✅ | #1 | s3 |  |
| q29 | mental-health | ✅ | ✅ | ❌ | #1 | s3 |  |
| q30 | career-services | ✅ | ✅ | ✅ | #1 | crawler |  |
| q31 | dual-enrollment | ❌ | ✅ | ❌ |  |  | correct-source-ranked-too-low |
| q32 | orientation | ✅ | ✅ | ✅ | #2 | crawler |  |
| q33 | degrees-and-certificates | ❌ | ✅ | ❌ |  |  | correct-source-ranked-too-low |
| q34 | catalog | ✅ | ✅ | ❌ | #4 | s3 |  |
| q35 | campus-contact | ✅ | ✅ | ✅ | #2 | s3 |  |
| q36 | campus-map | ✅ | ✅ | ❌ | #1 | s3 |  |
| q37 | admissions | ✅ | ✅ | ✅ | #2 | s3 |  |
| q38 | cost-of-attendance | ❌ | ✅ | ❌ |  |  | correct-source-ranked-too-low |
| q39 | dream-resource-center | ✅ | ✅ | ❌ | #6 | s3 |  |
| q40 | financial-aid | ✅ | ✅ | ❌ | #1 | s3 |  |
| q41 | academic-calendar | ✅ | ✅ | ✅ | #5 | crawler |  |
| q42 | helpdesk | ❌ | ✅ | ❌ |  |  | correct-source-ranked-too-low |
| q43 | grants-and-scholarships | ✅ | ✅ | ❌ | #1 | s3 |  |
| q44 | tuition-and-fees | ✅ | ✅ | ❌ | #2 | s3 |  |
| q45 | degrees-and-certificates | ❌ | ✅ | ❌ |  |  | correct-source-ranked-too-low |
