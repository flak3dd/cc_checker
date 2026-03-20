#!/bin/bash

# CC Checker & Plate Rotator - Unified Startup Script

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Starting CC Checker System...${NC}"

# 1. Start FastAPI Backend
echo -e "${GREEN}📡 Starting Backend (FastAPI)...${NC}"
python3 -m uvicorn api.main:app --host 0.0.0.0 --port 8000 &
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
