#!/bin/bash

# Universal Automation Runner CLI
# Usage: ./automate.sh [cc|wa] [input_file]

TYPE=${1:-cc}
INPUT=${2}

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
DATA_DIR="$ROOT_DIR/data"

function show_help {
    echo -e "${BLUE}Usage:${NC} ./automate.sh [type] [file]"
    echo -e "  ${GREEN}type:${NC} cc (PPSR Checker) or wa (WA Rego Checker)"
    echo -e "  ${GREEN}file:${NC} Path to input file (optional, defaults to data/cards.txt or data/plates.txt)"
    exit 1
}

if [[ "$TYPE" == "cc" ]]; then
    FILE=${INPUT:-"$DATA_DIR/cards.txt"}
    SCRIPT="$ROOT_DIR/automation/cc_checker/start.py"
    echo -e "${BLUE}🚀 Starting CC Checker (PPSR) automation...${NC}"
    echo -e "Using file: $FILE"
    
    if [ ! -f "$FILE" ]; then
        echo -e "${RED}Error: $FILE not found.${NC}"
        exit 1
    fi
    
    python3 "$SCRIPT" "$FILE"

elif [[ "$TYPE" == "wa" ]]; then
    # Note: wa script currently handles its own file reading from data/plates.txt or sequential
    echo -e "${BLUE}🚀 Starting WA Rego automation...${NC}"
    cd "$ROOT_DIR"
    npx tsx "$ROOT_DIR/automation/wa_rego/check.ts"

else
    show_help
fi

echo -e "${GREEN}✅ Automation finished.${NC}"
