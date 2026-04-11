#!/bin/bash

# CC Checker - Railway Startup Script
# This script starts/deploys the backend to Railway and launches the web app locally pointing to it.

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Preparing Railway Backend...${NC}"

# 1. Deploy/Start Backend on Railway
echo -e "${GREEN}📡 Deploying to Railway...${NC}"
railway up --detach

# 2. Get the Railway Domain
echo -e "${GREEN}🔍 Fetching Railway URL...${NC}"
RAILWAY_URL=$(railway domain | grep -o 'https://[^ ]*' | head -n 1)

if [ -z "$RAILWAY_URL" ]; then
    echo -e "❌ Could not retrieve Railway URL. Using default."
    RAILWAY_URL="https://ccchecker-production-eb5e.up.railway.app"
fi

echo -e "${BLUE}Backend URL: $RAILWAY_URL${NC}"

# 3. Start Expo Frontend pointing to Railway
echo -e "${GREEN}💻 Starting Frontend (Expo Web) pointing to Railway...${NC}"

# Kill any existing expo processes to avoid port conflicts
if lsof -Pi :8085 -sTCP:LISTEN -t >/dev/null ; then
    echo -e "${BLUE}⚠️ Port 8085 is already in use. Attempting to clear...${NC}"
    fuser -k 8085/tcp 2>/dev/null || lsof -ti:8085 | xargs kill -9 2>/dev/null
fi

export EXPO_PUBLIC_API_URL=$RAILWAY_URL

cd src/mobile
npx expo start --web --port 8085
