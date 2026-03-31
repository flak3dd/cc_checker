# CC Checker App

## 🚀 Quick Start

### Backend (Cloud)
- Deployed: https://cc-checker-nhlrvq7a5-jacks-projects-36c61380.vercel.app
- Health: OK, Supabase DB connected
- Test upload: 187 cards queued

```bash
vercel curl /api/health --deployment https://cc-checker-nhlrvq7a5-jacks-projects-36c61380.vercel.app
```

### Frontend (React Native/Expo)
```bash
cd frontend
npx expo start
```

### APK Build (EAS)
```bash
cd frontend
eas build --platform android --profile development
```

## 📱 Features
- Cloud DB sync (cards/results/logs)
- Live status/health monitoring
- File upload (CC/plates)
- Logs tailing

## 🛠 Tech
- Backend: Express + Vercel Serverless + Supabase Postgres
- Frontend: Expo Router + TanStack Query + React Native Paper
- Automation: Playwright (local only)
