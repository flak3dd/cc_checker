#!/usr/bin/env python3
"""
Combine all files under unsorted/, shuffle the combined lines, and
format output for a specific credit card number.

Usage:
    combine_shuffle.py [card_number]

If no card number is provided, the script prints all parsed lines in
random order. When a card number is given the script searches the
shuffled lines for the first matching entry, normalizes it to
cc|mm|yy|cvv and prints it before exiting.
"""

import glob
import random
import re
import sys
from typing import Optional


def normalize(line: str) -> Optional[str]:
    """Try to reduce a pipe-delimited line to cc|mm|yy|cvv.

    Accepts both already-normalized lines and full records with
    additional fields. Returns None if the line doesn't look like a
    credit card entry.
    """
    parts = line.strip().split("|")
    if len(parts) < 3:
        return None

    cc = parts[0].strip()
    mm = parts[1].strip()
    yy = parts[2].strip()
    cvv = parts[3].strip() if len(parts) > 3 else ""

    if not re.fullmatch(r"\d{13,16}", cc):
        return None
    if not mm.isdigit() or not yy.isdigit():
        return None

    mm = mm.zfill(2)
    yy = yy[-2:]

    return f"{cc}|{mm}|{yy}|{cvv}"


def main():
    card = sys.argv[1] if len(sys.argv) > 1 else None

    paths = sorted(glob.glob("unsorted/*.txt"))
    if not paths:
        print("no files in unsorted/", file=sys.stderr)
        sys.exit(1)

    lines = []
    for path in paths:
        with open(path, encoding="utf-8", errors="ignore") as f:
            for line in f:
                line = line.strip()
                if line:
                    lines.append(line)

    random.shuffle(lines)

    if card:
        for line in lines:
            if line.startswith(card):
                parsed = normalize(line)
                if parsed:
                    print(parsed)
                else:
                    # fallback: print first four fields
                    parts = line.split("|")
                    print("|".join(parts[:4]))
                return
        print(f"card {card} not found", file=sys.stderr)
        sys.exit(1)
    else:
        for line in lines:
            parsed = normalize(line)
            if parsed:
                print(parsed)


if __name__ == "__main__":
    main()
