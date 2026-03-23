#!/bin/bash

# CC Checker & Plate Rotator - Unified Startup Script

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Starting CC Checker System...${NC}"

# 0. Kill any orphan automation processes from previous runs
echo -e "${GREEN}🧹 Cleaning up orphan processes...${NC}"
pkill -f "tsx.*automation/" 2>/dev/null
pkill -f "tsx.*check" 2>/dev/null
pkill -f "tsx.*checkout" 2>/dev/null
pkill -f "tsx.*carfacts" 2>/dev/null
# Clean stale state files
rm -f data/wa_pending_payment.json data/wa_selected_card.json 2>/dev/null

# 1. Start Node.js TypeScript Backend
echo -e "${GREEN}📡 Starting Backend (TypeScript/Express)...${NC}"
npx tsx backend/server.ts --port 8000 &
BACKEND_PID=$!

# 2. Start Expo Frontend
echo -e "${GREEN}💻 Starting Frontend (Expo Web)...${NC}"
cd frontend
# Using port 8085 to avoid common Docker/system conflicts
npx expo start --web --port 8085 &
FRONTEND_PID=$!

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  Dashboard:  http://localhost:8085${NC}"
echo -e "${BLUE}  API:        http://localhost:8000${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "Press ${GREEN}Ctrl+C${NC} to stop both servers."

# Trap SIGINT (Ctrl+C) to kill both processes
function cleanup {
    echo -e "\n${BLUE}🛑 Stopping servers...${NC}"
    kill $BACKEND_PID
    kill $FRONTEND_PID
    exit
}

trap cleanup SIGINT

# Keep script running
wait
