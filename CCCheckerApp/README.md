# CC Checker Monitor - Mobile App

A real-time monitoring dashboard for the CC Checker automation system, built with Expo and React Native Paper.

## Project Structure

```
CCCheckerApp/
├── app/                          # Expo Router app directory
│   ├── (tabs)/                   # Tab navigation screens
│   │   ├── index.tsx            # Dashboard screen (status + analytics)
│   │   ├── explore.tsx          # Results gallery screen
│   │   └── _layout.tsx          # Tab navigation layout
│   ├── _layout.tsx              # Root layout with providers
│   └── modal.tsx                # Modal screen (template)
├── components/                   # Reusable components
│   ├── StatusCard.tsx           # Processing status widget
│   ├── ResultCard.tsx           # Individual result card
│   ├── AnalyticsWidget.tsx      # Performance analytics display
│   └── ui/                      # Built-in UI components
├── hooks/                        # Custom React hooks
│   └── useQueries.ts            # TanStack Query hooks
├── services/                     # API & data services
│   └── api.ts                   # API client and endpoints
├── types/                        # TypeScript type definitions
│   └── index.ts                 # All app types
└── constants/                    # Constants and theme
    └── theme.ts                 # Design tokens
```

## Features

### 📊 Dashboard Screen
- **Processing Status**: Real-time indicator showing if automation is running
- **Cards Remaining**: Live count of pending cards to process
- **Total Processed**: Cumulative count of all processed cards
- **Pull-to-Refresh**: Manual refresh of status data

### 📋 Results Gallery Screen
- **Filter by Status**: Filter results by SUCCESS, FAIL, or view ALL
- **Card Details**: Last 4 digits of card, expiry date, status badge
- **Timestamp**: When each card was processed
- **Pagination Info**: Shows current page and total results

### 📈 Analytics Widget
- **Success Rate**: Visual progress bar showing success percentage
- **Success Count**: Number of successful transactions
- **Failed Count**: Number of failed transactions
- **Total Count**: Overall processed cards

## Tech Stack

- **Framework**: Expo (React Native)
- **UI Library**: React Native Paper
- **State Management**: Zustand
- **Data Fetching**: TanStack Query (React Query)
- **Navigation**: React Navigation (Bottom Tabs)
- **Animations**: React Native Reanimated
- **Language**: TypeScript

## Installation & Setup

```bash
# Install dependencies
npm install

# Start the development server
npm start

# Run on iOS simulator
npm run ios

# Run on Android emulator
npm run android

# Run on web
npm run web
```

## Environment Configuration

The app currently uses mock data. To connect to a real FastAPI backend:

1. Update `API_BASE_URL` in `services/api.ts`:
   ```typescript
   const API_BASE_URL = 'http://your-fastapi-server:8000';
   ```

2. Replace mock data generators with actual API calls

3. Implement WebSocket connection for real-time updates

## API Integration

The app expects the following endpoints from the FastAPI backend:

```typescript
// GET /api/status
{
  is_running: boolean;
  remaining_cards: number;
  total_processed: number;
}

// GET /api/results?page=1&limit=20
{
  items: CardResult[];
  total: number;
  page: number;
  limit: number;
}

// GET /api/analytics
{
  success_count: number;
  fail_count: number;
  total_count: number;
  success_rate: number;
  current_card?: CardResult;
}
```

## Color Scheme

| Color | Usage |
|-------|-------|
| `#10B981` | Success status (green) |
| `#EF4444` | Failed status (red) |
| `#3B82F6` | Processing/accent (blue) |
| `#F9FAFB` | Background (light gray) |
| `#111827` | Text primary (dark gray) |
| `#6B7280` | Text secondary (medium gray) |

## Performance Optimization

- **Polling**: Status updates every 2 seconds
- **Analytics**: Refresh every 5 seconds
- **Results**: Paginated (20 items per page)
- **Memoization**: Components wrapped with React.memo where appropriate
- **Query Caching**: TanStack Query handles automatic cache management

## Future Enhancements

- [ ] WebSocket real-time updates instead of polling
- [ ] Export results as CSV
- [ ] Advanced filtering and sorting
- [ ] Dark mode support
- [ ] Push notifications for processing events
- [ ] Detailed result view with screenshot preview
- [ ] Control buttons to start/stop/skip processing

## Development Notes

- Components use React Native Paper's Material Design system
- All styling uses StyleSheet for optimal performance
- Type safety enforced with TypeScript
- Custom hooks manage all data fetching logic
- API responses are mocked for development
