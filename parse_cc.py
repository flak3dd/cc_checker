#!/usr/bin/env python3
"""
Parse credit card data from pipe-delimited text into cc|mm|yy|cvv format.
"""

import glob
import os
import re
import sys
from typing import Optional


def parse_line(line: str) -> Optional[str]:
    """
    Parse a single line of pipe-delimited data.
    Expected format: cc|mm/yy|cvv|name|...
    Returns: cc|mm|yy|cvv or None if parsing fails.
    """
    line = line.strip()
    if not line:
        return None

    parts = line.split("|")
    if len(parts) < 3:
        return None

    cc = parts[0].strip()
    expiry = parts[1].strip()
    cvv = parts[2].strip()

    # Parse mm/yy or mm-yy
    match = re.match(r"(\d{1,2})[/\-](\d{2,4})", expiry)
    if not match:
        return None

    mm = match.group(1).zfill(2)
    yy_raw = match.group(2)
    yy = yy_raw[-2:] if len(yy_raw) > 2 else yy_raw

    return f"{cc}|{mm}|{yy}|{cvv}"


def parse_text(text: str) -> list[str]:
    """Parse multi-line text, returning list of cc|mm|yy|cvv strings."""
    results = []
    for line in text.splitlines():
        parsed = parse_line(line)
        if parsed:
            results.append(parsed)
    return results


DEFAULT_DIR = "unsorted"


def main():
    if len(sys.argv) >= 2 and sys.argv[1] == "-":
        text = sys.stdin.read()
        for result in parse_text(text):
            print(result)
        return

    if len(sys.argv) >= 2:
        target = sys.argv[1]
    else:
        target = DEFAULT_DIR

    if os.path.isdir(target):
        files = sorted(glob.glob(os.path.join(target, "*.txt")))
        if not files:
            print(f"No .txt files found in {target}/")
            return
        for filepath in files:
            with open(filepath) as f:
                text = f.read()
            results = parse_text(text)
            for result in results:
                print(result)
    elif os.path.isfile(target):
        with open(target) as f:
            text = f.read()
        for result in parse_text(text):
            print(result)
    else:
        print(f"Not found: {target}")
        sys.exit(1)


if __name__ == "__main__":
    main()
