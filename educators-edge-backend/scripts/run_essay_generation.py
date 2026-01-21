#!/usr/bin/env python
"""
Python wrapper script for EssayMentor AI integration
Bridges educators-edge-backend to essaymentor-ai 6-agent system

This script is called by Node.js via child_process.spawn()
It runs the full essay generation workflow and returns JSON to stdout
"""

import sys
import os
import json
import argparse
import re
from pathlib import Path

def setup_essaymentor_path(essaymentor_path):
    """Add essaymentor-ai to Python path"""
    if essaymentor_path not in sys.path:
        sys.path.insert(0, essaymentor_path)

    # Verify the path exists
    if not os.path.exists(essaymentor_path):
        raise FileNotFoundError(f"EssayMentor AI directory not found: {essaymentor_path}")

    print(f"[Setup] Using EssayMentor AI from: {essaymentor_path}", file=sys.stderr)

def parse_arguments():
    """Parse command line arguments"""
    parser = argparse.ArgumentParser(description='Generate college essay using EssayMentor AI')
    parser.add_argument('--prompt', required=True, help='Essay prompt')
    parser.add_argument('--university', required=True, help='Target university')
    parser.add_argument('--word-count', type=int, default=650, help='Target word count')
    parser.add_argument('--student-profile', required=True, help='Student profile JSON')
    parser.add_argument('--essaymentor-path', required=True, help='Path to essaymentor-ai directory')

    return parser.parse_args()

def extract_quality_score(critique):
    """Extract quality score from critique text

    Args:
        critique (str): Critique text from the critique agent

    Returns:
        float: Quality score (0-10)
    """
    if not critique:
        return 0.0

    # Look for patterns like "8.5/10" or "9/10"
    patterns = [
        r'(\d+(?:\.\d+)?)\s*/\s*10',  # "8.5/10" or "8.5 / 10"
        r'Score:\s*(\d+(?:\.\d+)?)',   # "Score: 8.5"
        r'Rating:\s*(\d+(?:\.\d+)?)',  # "Rating: 8.5"
    ]

    for pattern in patterns:
        match = re.search(pattern, critique, re.IGNORECASE)
        if match:
            score = float(match.group(1))
            # Ensure score is in valid range
            return min(10.0, max(0.0, score))

    # Default score if no pattern found
    return 7.5

def run_essay_generation(prompt, student_profile, university, word_count, essaymentor_path):
    """Run the essay generation workflow

    Args:
        prompt (str): Essay prompt
        student_profile (dict): Student profile
        university (str): Target university
        word_count (int): Target word count
        essaymentor_path (str): Path to essaymentor-ai

    Returns:
        dict: Generated essay and metadata
    """
    print(f"[Essay Generation] Starting workflow...", file=sys.stderr)
    print(f"[Essay Generation] University: {university}", file=sys.stderr)
    print(f"[Essay Generation] Target words: {word_count}", file=sys.stderr)

    # Import the workflow from essaymentor-ai
    try:
        from agents.workflow import run_essay_generation as run_workflow
        print("[Essay Generation] Successfully imported workflow", file=sys.stderr)
    except ImportError as e:
        print(f"[ERROR] Failed to import workflow: {e}", file=sys.stderr)
        print(f"[ERROR] Python path: {sys.path}", file=sys.stderr)
        raise ImportError(f"Could not import essaymentor-ai workflow. Ensure the path is correct: {essaymentor_path}")

    # Run the 6-agent workflow
    print("[Essay Generation] Running agents...", file=sys.stderr)
    result = run_workflow(
        prompt=prompt,
        student_profile=student_profile,
        target_university=university,
        essay_type='common_app',
        word_count=word_count
    )

    print("[Essay Generation] Workflow completed!", file=sys.stderr)

    # Extract results
    essay_text = result.get('final_essay', '')
    critique_text = result.get('critique', '')

    # Calculate actual word count
    actual_word_count = len(essay_text.split())

    # Extract quality score from critique
    quality_score = extract_quality_score(critique_text)

    print(f"[Essay Generation] Generated {actual_word_count} words", file=sys.stderr)
    print(f"[Essay Generation] Quality score: {quality_score}/10", file=sys.stderr)

    return {
        'essay': essay_text,
        'critique': critique_text,
        'word_count': actual_word_count,
        'quality_score': quality_score,
        'target_university': university,
        'target_word_count': word_count
    }

def main():
    """Main entry point"""
    try:
        # Parse arguments
        args = parse_arguments()

        # Setup essaymentor-ai path
        setup_essaymentor_path(args.essaymentor_path)

        # Parse student profile JSON
        try:
            student_profile = json.loads(args.student_profile)
        except json.JSONDecodeError as e:
            print(f"[ERROR] Invalid student profile JSON: {e}", file=sys.stderr)
            sys.exit(1)

        # Run essay generation
        result = run_essay_generation(
            prompt=args.prompt,
            student_profile=student_profile,
            university=args.university,
            word_count=args.word_count,
            essaymentor_path=args.essaymentor_path
        )

        # Output JSON to stdout (Node.js will parse this)
        print(json.dumps(result))
        sys.exit(0)

    except Exception as e:
        # Print error to stderr
        print(f"[FATAL ERROR] {str(e)}", file=sys.stderr)
        import traceback
        traceback.print_exc(file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
