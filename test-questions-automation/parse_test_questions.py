#!/usr/bin/env python3
"""
Parse markdown test question files and generate a structured JSON output.
This script extracts questions, good criteria, and bad criteria from markdown files
in the test-questions directory.
"""

import json
import re
from pathlib import Path
from typing import List, Dict, Any


def parse_markdown_file(filepath: Path) -> Dict[str, Any]:
    """
    Parse a single markdown file and extract questions with their rubrics.
    
    Args:
        filepath: Path to the markdown file
        
    Returns:
        Dictionary containing file metadata and parsed questions
    """
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Extract title (first # heading)
    title_match = re.search(r'^#\s+(.+)$', content, re.MULTILINE)
    title = title_match.group(1) if title_match else filepath.stem
    
    questions = []
    
    # Pattern to match question sections
    # Looks for: ### [number]. [emoji] [title]
    question_pattern = r'###\s+(\d+)\.\s+(🔵|🟣)?\s*(.+?)\n\*\*Q\d+:\s*"(.+?)"\*\*\n(.*?)(?=###|\n---\n|\Z)'
    
    matches = re.finditer(question_pattern, content, re.DOTALL)
    
    for match in matches:
        question_num = match.group(1)
        emoji = match.group(2) if match.group(2) else ""
        section_title = match.group(3).strip()
        question_text = match.group(4).strip()
        criteria_block = match.group(5).strip()
        
        # Stop at horizontal rule or "Section" heading (end of questions section)
        criteria_block = re.split(r'\n---+\n|^##\s+(?:Section|Scoring)', criteria_block)[0].strip()
        
        # Parse good and bad criteria
        good_criteria = []
        bad_criteria = []
        
        # Extract good criteria (lines starting with - ✅ Good:)
        good_matches = re.finditer(r'-\s*✅\s*Good:\s*(.+?)(?=\n\s*-\s*❌|\n\n|\Z)', criteria_block, re.DOTALL)
        for good_match in good_matches:
            good_text = good_match.group(1).strip()
            # Clean up extra whitespace and newlines
            good_text = re.sub(r'\s+', ' ', good_text)
            good_criteria.append(good_text)
        
        # Extract bad criteria (lines starting with - ❌ Bad:)
        bad_matches = re.finditer(r'-\s*❌\s*Bad:\s*(.+?)(?=\n\s*-\s*✅|\n\n|\Z)', criteria_block, re.DOTALL)
        for bad_match in bad_matches:
            bad_text = bad_match.group(1).strip()
            # Clean up extra whitespace and newlines
            bad_text = re.sub(r'\s+', ' ', bad_text)
            bad_criteria.append(bad_text)
        
        # Determine question type based on emoji
        question_type = "core" if emoji == "🔵" else "supplemental" if emoji == "🟣" else "unknown"
        
        question_obj = {
            "question_number": int(question_num),
            "question_type": question_type,
            "section_title": section_title,
            "question_text": question_text,
            "good_criteria": good_criteria,
            "bad_criteria": bad_criteria
        }
        
        questions.append(question_obj)
    
    return {
        "source_file": str(filepath),
        "title": title,
        "total_questions": len(questions),
        "questions": questions
    }


def parse_all_markdown_files(directory: str = "../test-questions") -> Dict[str, Any]:
    """
    Parse all markdown files in the specified directory.
    
    Args:
        directory: Path to the directory containing markdown files
        
    Returns:
        Dictionary containing all parsed test questions
    """
    test_dir = Path(directory)
    
    if not test_dir.exists():
        raise FileNotFoundError(f"Directory '{directory}' not found")
    
    # Find all .md files recursively
    md_files = list(test_dir.glob("**/*.md"))
    
    if not md_files:
        raise FileNotFoundError(f"No markdown files found in '{directory}'")
    
    parsed_files = []
    total_questions = 0
    seen_files = set()  # Track file basenames to avoid duplicates
    
    for md_file in md_files:
        # Check for duplicates based on filename
        if md_file.name in seen_files:
            print(f"Skipping duplicate: {md_file} (already parsed)")
            continue
        
        print(f"Parsing: {md_file}")
        try:
            parsed_data = parse_markdown_file(md_file)
            if parsed_data["questions"]:  # Only include files with questions
                parsed_files.append(parsed_data)
                total_questions += parsed_data["total_questions"]
                seen_files.add(md_file.name)
                print(f"  ✓ Found {parsed_data['total_questions']} questions")
            else:
                print(f"  ⚠ No questions found (may be a supplementary file)")
        except Exception as e:
            print(f"  ✗ Error parsing file: {e}")
    
    return {
        "metadata": {
            "total_files_parsed": len(parsed_files),
            "total_questions": total_questions,
            "source_directory": directory
        },
        "test_files": parsed_files
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
        print(f"  Total files: {result['metadata']['total_files_parsed']}")
        print(f"  Total questions: {result['metadata']['total_questions']}")
        print("=" * 60)
        
    except Exception as e:
        print(f"\n✗ Error: {e}")
        return 1
    
    return 0


if __name__ == "__main__":
    exit(main())
