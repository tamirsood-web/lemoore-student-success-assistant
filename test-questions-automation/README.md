# Test Question Parser

This script parses markdown test plan files from the `../test-questions/` directory and generates a structured JSON output containing all questions and their evaluation rubrics.

## Usage

From within the `test-questions-automation/` directory:

```bash
python3 parse_test_questions.py
```

Or from the project root:

```bash
python3 test-questions-automation/parse_test_questions.py
```

## Output

The script generates `test_questions.json` in the same directory with the following structure:

```json
{
  "metadata": {
    "total_files_parsed": 3,
    "total_questions": 40,
    "source_directory": "test-questions"
  },
  "test_files": [
    {
      "source_file": "path/to/file.md",
      "title": "Test Plan Title",
      "total_questions": 15,
      "questions": [
        {
          "question_number": 1,
          "question_type": "core",
          "section_title": "Topic description",
          "question_text": "The actual question text",
          "good_criteria": [
            "List of criteria for a good response"
          ],
          "bad_criteria": [
            "List of criteria for a bad response"
          ]
        }
      ]
    }
  ]
}
```

## Question Types

- **core** (🔵): Core topic questions that test fundamental functionality
- **supplemental** (🟣): Supplemental/stress-test questions for edge cases
- **unknown**: Questions without an emoji indicator

## Features

- Recursively parses all `.md` files in the `../test-questions/` directory
- Automatically skips duplicate files (same filename in different subdirectories)
- Extracts question text, section titles, and evaluation criteria
- Distinguishes between "good" and "bad" response criteria
- Categorizes questions by type (core vs. supplemental)
- Outputs clean, structured JSON for programmatic use

## Requirements

- Python 3.6+
- No external dependencies (uses only standard library)

## Example Use Cases

1. **Automated Testing**: Load questions and rubrics to test chatbot responses
2. **Quality Assurance**: Systematically evaluate chatbot performance against criteria
3. **Documentation**: Generate test coverage reports
4. **Integration**: Feed questions into testing frameworks or CI/CD pipelines
