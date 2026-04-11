# CC Checker & Automation Suite

A comprehensive credit card validation and plate registration automation system with modern web and mobile interfaces.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn
- For mobile: Expo CLI (`npm install -g @expo/cli`)

### Installation

1. **Clone and install dependencies:**
```bash
git clone <repository-url>
cd cc_checker
npm install
```

2. **Environment Setup:**
```bash
# Copy environment template
cp .env.example .env.local

# Edit .env.local with your configuration
# For local development, most settings can use defaults
```

### Running the Application

#### Full Stack (Recommended)
```bash
npm run dev
```
This starts both backend (port 8000) and Expo web (port 8085).

#### Backend Only
```bash
npx tsx src/server/index.ts --port 8000
```

#### Mobile App Only
```bash
npx expo start --web --port 8085
```

#### Production APK Build
```bash
eas build --platform android --profile production
```

## 📱 Features

### Core Functionality
- **Credit Card Validation**: Automated PPSR payment gateway testing
- **WA Registration Automation**: Automated plate registration payments
- **Gateway2 Integration**: DonorPerfect donation gateway validation
- **Plate Rotation**: Automated WA government registration lookup

### User Interface
- **Dashboard**: Real-time monitoring with live stats and controls
- **Results Management**: Sortable, filterable results with screenshot viewing
- **Log Streaming**: Live activity monitoring across all processes
- **File Upload**: Secure card/plate data upload with validation
- **Status Monitoring**: Health checks and process management

### Technical Features
- **Cloud Sync**: Supabase PostgreSQL database integration
- **Offline Support**: Graceful degradation with local storage
- **Security**: Rate limiting, input validation, and secure file handling
- **Performance**: Optimized queries, compression, and caching
- **Error Handling**: Comprehensive error boundaries and logging

## 🛠 Technology Stack

### Backend
- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js with middleware (compression, rate limiting, CORS)
- **Database**: PostgreSQL (Supabase) with connection pooling
- **Deployment**: Vercel serverless with Railway fallback
- **Automation**: Playwright with stealth plugins

### Frontend
- **Framework**: React Native with Expo
- **Navigation**: Expo Router (file-based routing)
- **State Management**: TanStack Query (React Query)
- **UI Components**: React Native Paper with custom theming
- **Animations**: React Native Reanimated
- **Forms**: Native file handling with validation

### Development Tools
- **Linting**: ESLint with Expo configuration
- **Testing**: Manual testing with automated health checks
- **Build**: EAS Build for mobile distributions
- **Version Control**: Git with conventional commits

## 📁 Project Structure

```
src/
├── mobile/                 # React Native/Expo app
│   ├── app/               # Expo Router pages
│   ├── components/        # Reusable UI components
│   ├── constants/         # Theme, config constants
│   ├── hooks/            # Custom React hooks
│   ├── services/         # API and external services
│   └── utils/            # Utility functions
├── server/               # Express backend
│   ├── index.ts          # Main server file
│   └── routes/           # API route handlers
├── automation/           # Playwright automation scripts
│   ├── shared/           # Common automation utilities
│   ├── cc_checker/       # PPSR validation
│   ├── wa_rego/          # WA registration
│   └── gateway2/         # DonorPerfect validation
└── data/                 # Local data storage (logs, results)
```

## 🔧 Configuration

### Environment Variables
```env
# Database
POSTGRES_URL=your_supabase_connection_string
DATABASE_URL=your_fallback_db_url

# Server
PORT=8000
VERCEL=0  # Set to 1 for Vercel deployment

# Security
NODE_ENV=development
```

### Build Profiles (eas.json)
- `development`: Debug builds with dev tools
- `production`: Optimized release builds
- `preview`: Staging builds for testing

## 🚀 Deployment

### Backend Deployment
```bash
# Vercel (recommended)
npm install -g vercel
vercel --prod

# Railway (alternative)
railway deploy
```

### Mobile Deployment
```bash
# Android APK
eas build --platform android --profile production

# iOS IPA
eas build --platform ios --profile production
```

## 🔒 Security

- **Rate Limiting**: 100 requests per 15 minutes per IP
- **Input Validation**: Strict file type and content validation
- **HTTPS Only**: All production deployments use HTTPS
- **Secrets Management**: Environment variables for sensitive data
- **File Upload Security**: Size limits (10MB) and type restrictions

## 📊 Monitoring

- **Health Checks**: `/api/health` endpoint for system status
- **Process Monitoring**: Real-time status of all automation processes
- **Error Logging**: Structured logging with error boundaries
- **Performance Metrics**: Query optimization and caching

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is proprietary software. See LICENSE file for details.

## 🆘 Support

For issues and questions:
- Check the logs in `data/` directory
- Review server logs in deployment platform
- Test with `/api/health` endpoint
