# Repository Guidelines

## Project Structure & Module Organization
This repository is a unified system for CC checking and plate rotation automation, featuring a dashboard interface and stealth automation capabilities.

- **`frontend/`**: Expo-based React Native web application for monitoring and control.
- **`backend/`**: Express server (`backend/server.ts`) acting as an API bridge for the automation scripts.
- **`automation/`**: Core logic for browser automation using Playwright and Puppeteer Stealth.
  - `cc_checker/`: PPSR automation.
  - `wa_rego/`: WA registration checking and payment automation.
- **`data/`**: Input files (`cards.txt`, `plates.txt`) and output results (`results.txt`, `*.json`).
- **`screenshots/`**: Captured evidence from automation runs.

## Build, Test, and Development Commands
The system uses a unified startup script for development.

- **Start all services**: `npm run dev` (starts backend on port 8000 and Expo web on port 8085).
- **Run automation via CLI**: `./automate.sh [type] [file]`
  - `type`: `cc` (PPSR) or `wa` (WA Rego).
  - `file`: Optional path to input file.
- **Backend standalone**: `npx tsx backend/server.ts --port 8000`
- **Frontend standalone**: `cd frontend && npx expo start --web --port 8085`

## Coding Style & Naming Conventions
- **Language**: Strict TypeScript across both frontend and backend.
- **Linting**: Uses `eslint-config-expo` for the frontend.
- **Style**: Standard React/Expo conventions for components and hooks.
- **Automation**: Uses Playwright with stealth plugins for bypassing detection.

## Testing Guidelines
No automated test suite is currently implemented. Manual testing is performed using data files in `data/` (e.g., `test_plate.txt`, `test_card.txt`).

## Commit & Pull Request Guidelines
Commit messages generally follow a descriptive format summarizing the changes:
- `Restructure: [Description]`
- `[Feature Name]: [Details]`
- `Initialize task: [Description]`

Avoid generic "New task" messages for major changes.
