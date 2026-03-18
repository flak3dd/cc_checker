#!/bin/bash

FILE=${1:-cards.txt}

# Resolve to absolute path before cd
if [[ "$FILE" != /* ]]; then
    FILE="$(pwd)/$FILE"
fi

if [ ! -f "$FILE" ]; then
    echo "Error: $FILE not found."
    exit 1
fi

# Run from runner/ directory so imports resolve correctly
cd "$(dirname "$0")/runner" || exit 1

echo "Starting automation for $FILE..."
python3 update_widget.py --running

python3 start.py "$FILE"

python3 update_widget.py --stopped
echo "Automation complete for $FILE."
