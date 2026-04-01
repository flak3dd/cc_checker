# Repository Guidelines

## Project Structure & Module Organization
This repository is a unified system for CC checking and plate rotation automation, featuring a dashboard interface and stealth automation capabilities.

- **`src/mobile/`**: Expo-based React Native application code (app, components, hooks, assets).
- **`src/server/`**: Express server (`index.ts`) acting as an API bridge.
- **`src/automation/`**: Core logic for browser automation using Playwright and Puppeteer Stealth.
- **`data/`**: Input files (`cards.txt`, `plates.txt`) and output results (`results.txt`, `*.json`).
- **`screenshots/`**: Captured evidence from automation runs.

## Build, Test, and Development Commands
The system uses a unified startup script for development.

- **Start all services**: `npm run dev` (starts backend on port 8000 and Expo web on port 8085).
- **Run automation via CLI**: `./automate.sh [type] [file]`
  - `type`: `cc` (PPSR) or `wa` (WA Rego).
  - `file`: Optional path to input file.
- **Backend standalone**: `npx tsx src/server/index.ts --port 8000`
- **Mobile standalone**: `npx expo start --web --port 8085`

## Coding Style & Naming Conventions
- **Language**: Strict TypeScript across both mobile and server.
- **Linting**: Uses `eslint-config-expo` for the mobile app.
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
