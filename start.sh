#!/bin/bash

# CC Checker & Plate Rotator - Unified Startup Script

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Starting CC Checker System...${NC}"

# 0. Kill any orphan automation processes and check ports
echo -e "${GREEN}🧹 Cleaning up orphan processes and checking ports...${NC}"

# Check if ports are in use and offer to kill them or exit
for port in 8000 8085; do
  if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null ; then
    echo -e "${BLUE}⚠️ Port $port is already in use.${NC}"
    echo -e "Attempting to clear port $port..."
    fuser -k $port/tcp 2>/dev/null || lsof -ti:$port | xargs kill -9 2>/dev/null
  fi
done

pkill -f "tsx.*automation/" 2>/dev/null
pkill -f "tsx.*check" 2>/dev/null
pkill -f "tsx.*checkout" 2>/dev/null
# Clean stale state files
rm -f data/wa_pending_payment.json data/wa_selected_card.json 2>/dev/null

# 1. Start Node.js TypeScript Backend
echo -e "${GREEN}📡 Starting Backend (TypeScript/Express)...${NC}"
PORT=8000 npx tsx src/server/index.ts --port 8000 &
BACKEND_PID=$!

# 2. Start Expo Frontend
echo -e "${GREEN}💻 Starting Frontend (Expo Web)...${NC}"
npx expo start --web --port 8085 &> frontend_start.log &
FRONTEND_PID=$!
echo "Expo PID: $FRONTEND_PID"

# Wait for servers to be ready
echo -e "${GREEN}⏳ Waiting for services to initialize...${NC}"
MAX_RETRIES=30
RETRY_COUNT=0
# Wait for backend health check
while ! curl -s http://127.0.0.1:8000/api/status >/dev/null && [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    sleep 1
    RETRY_COUNT=$((RETRY_COUNT+1))
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    echo -e "${BLUE}❌ Backend failed to start. Check logs or run manually.${NC}"
else
    echo -e "${GREEN}✅ Backend is ready!${NC}"
fi

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
