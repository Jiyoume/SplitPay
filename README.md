# SplitPay

A cross-platform mobile app to divide and track shared expenses for families, friends, and roommates.

Built with **React Native (Expo)** + **TypeScript** for APAC HACK 2026.

## Features

- **Groups** — Create groups for roommates, family, friends, or trips
- **Expense Tracking** — Add expenses with categories and split methods
- **Smart Splitting** — Equal, exact amount, or percentage-based splits
- **Balance Summary** — See who owes whom at a glance
- **Settle Up** — Record payments and simplify debts
- **Activity Feed** — Track all expense and payment activity

## Getting Started

### Prerequisites

- Node.js 22+
- Expo CLI (`npm install -g expo-cli`)
- Expo Go app on your phone (for testing)

### Installation

```bash
cd SplitPay
npm install
```

### Run the App

```bash
npm start
# or
npx expo start
```

Scan the QR code with Expo Go (Android) or Camera app (iOS).

## Project Structure

```
SplitPay/
├── App.tsx                    # Entry point
├── src/
│   ├── components/           # Reusable UI components
│   │   ├── MemberAvatar.tsx
│   │   ├── GroupCard.tsx
│   │   ├── ExpenseCard.tsx
│   │   └── BalanceSummary.tsx
│   ├── constants/            # Colors, categories, config
│   ├── models/               # TypeScript types/interfaces
│   ├── navigation/           # Tab + Stack navigators
│   ├── screens/              # All app screens
│   │   ├── HomeScreen.tsx
│   │   ├── GroupsScreen.tsx
│   │   ├── ActivityScreen.tsx
│   │   ├── ProfileScreen.tsx
│   │   ├── GroupDetailScreen.tsx
│   │   ├── AddExpenseScreen.tsx
│   │   ├── CreateGroupScreen.tsx
│   │   └── SettleUpScreen.tsx
│   ├── services/             # Data/storage services
│   └── utils/                # Split calculation logic
├── app.json                  # Expo configuration
├── package.json
└── tsconfig.json
```

## Tech Stack

- React Native + Expo SDK 51
- TypeScript
- React Navigation (tabs + stack)
- Ionicons for icons

## Next Steps

- [ ] Connect to a backend (Firebase / Supabase / custom API)
- [ ] Add user authentication
- [ ] Implement push notifications for payment reminders
- [ ] Add receipt photo capture with OCR
- [ ] Multi-currency support
- [ ] Export expense reports

## Team

APAC HACK 2026 Entry
