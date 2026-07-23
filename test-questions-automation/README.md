# Test Question Parser

This script parses markdown test question files from the `../test-questions/` directory and generates a structured JSON output containing all questions and their evaluation rubrics.

## Format

The script expects a simplified markdown format:

```markdown
# Question text here?

- Good: Criteria for a good response.

- Bad: Criteria for a bad response.


# Next question here?

- Good: Good criteria.

- Bad: Bad criteria.
```

Each question consists of:
1. A line starting with `# ` followed by the question text
2. A line starting with `- Good: ` followed by criteria for correct responses
3. A line starting with `- Bad: ` followed by criteria for incorrect responses
4. Blank lines between sections (optional but recommended for readability)

## Usage

From within the `test-questions-automation/` directory:

```bash
python3 parse_test_questions.py
```

Or from the project root:

```bash
python3 test-questions-automation/parse_test_questions.py
```

## Template Files

Files ending with `_TEMPLATE.md` are automatically excluded from parsing. These files contain format specifications and examples but no actual test questions.

## Output

The script generates `test_questions.json` with a simplified structure:

```json
{
  "total_questions": 25,
  "questions": [
    {
      "question": "How do I schedule a counseling appointment?",
      "good": "Directs to Counseling Services, provides contact info...",
      "bad": "Gives a generic answer with no specific contact info..."
    },
    {
      "question": "How do I apply for financial aid?",
      "good": "Explains the FAFSA process, mentions required documents...",
      "bad": "Skips prerequisites or provides incorrect information..."
    }
  ]
}
```

The output is a flat list of questions with their evaluation criteria. No file tracking, no question numbering, just the essential data for testing.

## Question Types

The simplified format no longer uses question type categorization (core/supplemental) or emoji indicators. All questions are treated equally and numbered sequentially within each file.

## Features

- Recursively parses all `.md` files in the `../test-questions/` directory
- Automatically excludes files ending with `_TEMPLATE.md`
- Automatically skips duplicate files (same filename in different subdirectories)
- Extracts question text and evaluation criteria using simple line-prefix matching
- Each question has exactly one good criterion and one bad criterion
- Outputs minimal, clean JSON structure (just total count and question list)
- No file tracking, no question numbering - just the essential test data
- Simple, maintainable format that's easy to write, edit, and consume programmatically

## Requirements

- Python 3.6+
- No external dependencies (uses only standard library)

## Example Use Cases

1. **Automated Testing**: Load questions and rubrics to test chatbot responses
2. **Quality Assurance**: Systematically evaluate chatbot performance against criteria
3. **Documentation**: Generate test coverage reports
4. **Integration**: Feed questions into testing frameworks or CI/CD pipelines
