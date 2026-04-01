#!/bin/bash

# CC Checker & WA Rego Automation - CLI Utility
# Usage: ./automate.sh [cc|wa] [optional_input_file]

TYPE=$1
FILE=$2

if [ "$TYPE" == "cc" ]; then
    echo "Starting PPSR CC Checker..."
    npx tsx src/automation/cc_checker/check.ts $FILE
elif [ "$TYPE" == "wa" ]; then
    echo "Starting WA Rego Checker..."
    npx tsx src/automation/wa_rego/check.ts $FILE
else
    echo "Usage: ./automate.sh [cc|wa] [optional_input_file]"
    exit 1
fi
