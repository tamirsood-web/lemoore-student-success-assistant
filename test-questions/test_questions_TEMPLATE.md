FORMAT SPECIFICATION AND EXAMPLE

This file defines the format for chatbot test question files. It is a reference file
only. It contains no real test questions and must be excluded from parsing.

Parsers must skip any file whose name contains the string TEMPLATE.


HOW TO WRITE A QUESTION FILE

A question file contains nothing but question blocks. No title, no introduction, no
section headers, no summary tables, no closing notes.

Each question block has exactly three parts, in this order:

1. A line beginning with a single hash and a space, followed by the question text.
   The question is written the way a real student would ask it. One line only.
2. A line beginning with "- Good: " followed by the criteria for a correct response.
   One line only, no internal line breaks.
3. A line beginning with "- Bad: " followed by the criteria for an incorrect response.
   One line only, no internal line breaks.

Put one blank line between the question and the Good line, and between the Good line
and the Bad line. Put two blank lines between question blocks.


RULES

Use plain ASCII characters only. No emojis, no em dashes, no curly quotes, no arrows,
no checkmarks, no symbols that require a special keystroke.

Do not number the questions. Order carries no meaning and numbering breaks when
questions are added or removed.

Do not add category labels, topic tags, or grouping headers. If questions need to be
grouped, put them in separate files.

Use exactly one Good line and one Bad line per question. Never zero, never two.

Do not add commentary, source citations as separate lines, or notes between blocks. If
a criterion depends on a source document, name the document inline within the Good or
Bad line itself.

Keep each question to a single question. If a question has two parts that need separate
grading, split it into two blocks.


WRITING USEFUL CRITERIA

Good criteria should state what a correct answer must contain: the specific fact, the
concrete next step, the office or contact, the required caveat. Avoid vague criteria
like "gives a helpful answer."

Bad criteria should name the specific failure modes that are plausible for that
question. The most useful ones to cover are: stating a specific fact that is not
actually grounded in source material, silently dropping part of a multipart question,
giving a vague answer with no actionable next step, fabricating rather than admitting
uncertainty, and confusing a policy with a similar policy from a different source.


PARSING CONTRACT

A question block is delimited by a line whose first two characters are a hash followed
by a space. Only the leading hash is a delimiter. A question is always exactly one line,
so a hash character may appear anywhere inside the question text without ambiguity.

Within a block, the Good line is identified by the exact leading prefix "- Good: " and
the Bad line by the exact leading prefix "- Bad: ". Match on that leading prefix only.
Do not split on the colon, because the criteria text may contain colons.

Blank lines are insignificant and may be collapsed.
No other line types appear in a valid question file.


EXAMPLE

The example below is fenced so it will not be picked up as real question content.

```
# My award letter shows a certain amount, but I'm only taking 9 units this semester instead of 12. Will my financial aid amount change?

- Good: Confirms yes. Explains that award amounts in the offer letter are based on full time enrollment status of 12 or more units, and that awards are adjusted if the student enrolls in fewer units. May note the adjustment happens automatically based on actual enrollment.

- Bad: Claims the award amount will not change regardless of units taken, omits the full time enrollment assumption behind award letters, or states a specific dollar adjustment not supported by source documents.


# Who do I talk to if my financial aid has not been disbursed yet?

- Good: Directs the student to the Financial Aid Office with a working phone number or email, and notes at least one common cause of delay such as incomplete verification documents or enrollment status not yet confirmed.

- Bad: Gives a generic instruction to contact the college with no department or contact method, states a specific disbursement date not grounded in source material, or asserts a cause of the delay as fact without qualifying it.
```
