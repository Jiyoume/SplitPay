# AmbagKo

Filipino-inspired expense-splitting and group payment app.
"Para malinaw ang ambagan."

## Stack
React Native + Expo (Expo Router) + TypeScript.

## Run
```
npm install
npx expo start
```

## Structure
- `app/` — screens and navigation (file-based routing via expo-router)
- `components/` — reusable UI components
- `constants/theme.ts` — colors, spacing, typography, light/dark mode
- `data/mockData.ts` — sample users, groups, expenses
- `context/` — auth state and theme state (in-memory + AsyncStorage)
- `types/` — shared TypeScript types

## Notes
This is a frontend template with mock data and local (AsyncStorage) persistence
for the current user's session. Swap `context/AuthContext.tsx` and `data/mockData.ts`
calls for real API / Supabase calls to go to production.
