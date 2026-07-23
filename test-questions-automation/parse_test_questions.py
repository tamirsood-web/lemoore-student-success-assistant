#!/usr/bin/env python3
"""
Parse markdown test question files and generate a structured JSON output.
This script extracts questions, good criteria, and bad criteria from markdown files
in the test-questions directory.

New simplified format:
- Questions start with "# " followed by the question text
- Good criteria start with "- Good: "
- Bad criteria start with "- Bad: "
- Blank lines separate sections
"""

import json
import re
from pathlib import Path
from typing import List, Dict, Any


def parse_markdown_file(filepath: Path) -> List[Dict[str, str]]:
    """
    Parse a single markdown file and extract questions with their rubrics.
    
    The new format expects:
    # Question text here
    
    - Good: Good criteria here
    
    - Bad: Bad criteria here
    
    Args:
        filepath: Path to the markdown file
        
    Returns:
        List of question dictionaries
    """
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    questions = []
    
    # Split content by lines starting with "# " (question headers)
    # This regex splits at lines starting with # and space, keeping the delimiter
    blocks = re.split(r'^(?=# )', content, flags=re.MULTILINE)
    
    for block in blocks:
        block = block.strip()
        if not block or not block.startswith('# '):
            continue
        
        # Extract question text (first line starting with "# ")
        lines = block.split('\n')
        question_text = lines[0][2:].strip()  # Remove "# " prefix
        
        # Find Good and Bad criteria
        good_criteria = ""
        bad_criteria = ""
        
        for line in lines[1:]:
            line = line.strip()
            if line.startswith('- Good:'):
                good_criteria = line[8:].strip()  # Remove "- Good: " prefix
            elif line.startswith('- Bad:'):
                bad_criteria = line[7:].strip()  # Remove "- Bad: " prefix
        
        # Only add if we found both criteria
        if good_criteria and bad_criteria:
            question_obj = {
                "question": question_text,
                "good": good_criteria,
                "bad": bad_criteria
            }
            questions.append(question_obj)
    
    return questions


def parse_all_markdown_files(directory: str = "../test-questions") -> Dict[str, Any]:
    """
    Parse all markdown files in the specified directory.
    Excludes files ending with _TEMPLATE.md
    
    Args:
        directory: Path to the directory containing markdown files
        
    Returns:
        Dictionary containing total count and list of questions
    """
    test_dir = Path(directory)
    
    if not test_dir.exists():
        raise FileNotFoundError(f"Directory '{directory}' not found")
    
    # Find all .md files recursively, excluding templates
    all_md_files = list(test_dir.glob("**/*.md"))
    md_files = [f for f in all_md_files if not f.name.endswith('_TEMPLATE.md')]
    
    if not md_files:
        raise FileNotFoundError(f"No markdown files found in '{directory}' (excluding templates)")
    
    # Show excluded templates
    template_files = [f for f in all_md_files if f.name.endswith('_TEMPLATE.md')]
    if template_files:
        print(f"Excluding {len(template_files)} template file(s):")
        for tf in template_files:
            print(f"  - {tf.name}")
        print()
    
    all_questions = []
    seen_files = set()  # Track file basenames to avoid duplicates
    
    for md_file in md_files:
        # Check for duplicates based on filename
        if md_file.name in seen_files:
            print(f"Skipping duplicate: {md_file} (already parsed)")
            continue
        
        print(f"Parsing: {md_file}")
        try:
            questions = parse_markdown_file(md_file)
            if questions:
                all_questions.extend(questions)
                seen_files.add(md_file.name)
                print(f"  ✓ Found {len(questions)} questions")
            else:
                print(f"  ⚠ No questions found (may be a supplementary file)")
        except Exception as e:
            print(f"  ✗ Error parsing file: {e}")
    
    return {
        "total_questions": len(all_questions),
        "questions": all_questions
    }


def main():
    """Main execution function."""
    print("=" * 60)
    print("Test Question Parser")
    print("=" * 60)
    print()
    
    # Parse all markdown files
    try:
        result = parse_all_markdown_files("../test-questions")
        
        # Write to JSON file
        output_file = "test_questions.json"
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(result, f, indent=2, ensure_ascii=False)
        
        print()
        print("=" * 60)
        print(f"✓ Successfully created '{output_file}'")
        print(f"  Total questions: {result['total_questions']}")
        print("=" * 60)
        
    except Exception as e:
        print(f"\n✗ Error: {e}")
        return 1
    
    return 0


if __name__ == "__main__":
    exit(main())
