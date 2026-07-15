# Supabase Agent Skills Configuration
# This file helps AI coding tools work with Supabase more accurately.

## Project Context

- **Project**: MyShare (SplitPay)
- **Supabase URL**: https://dmhqotrkfrhimdqoftil.supabase.co
- **Framework**: Expo (React Native) + PWA
- **Auth**: Supabase Auth (email, Google, phone OTP, MFA)
- **Database**: Supabase PostgreSQL + Firebase Firestore (hybrid)
- **Storage**: Supabase Storage + Firebase Storage
- **Blockchain**: Stellar (SEP-10, SEP-12, SEP-24)

## Supabase SDK Usage

```typescript
// Client-side (browser/PWA)
import { createClient } from '@/utils/supabase/client'
const supabase = createClient()

// Server-side (API routes)
import { createClient } from '@/utils/supabase/server'
const supabase = await createClient()

// Middleware (session refresh)
import { updateSession } from '@/utils/supabase/middleware'
```

## Database Schema

### Tables
- `expenses` — shared expenses with splits
- `groups` — expense groups (barkada, roommates, etc.)
- `group_members` — junction table
- `payments` — settlements between users
- `transactions` — top-ups, withdrawals
- `kyc_profiles` — KYC verification data
- `goals` — savings goals
- `points` — reward points history

### Auth
- Email/password
- Google OAuth
- Phone OTP (PH numbers: +63)
- Magic link
- MFA (TOTP)

### Row Level Security (RLS)
- Users can only access their own data
- Group members can access shared group data
- KYC data is private to the user

## Environment Variables

```env
EXPO_PUBLIC_SUPABASE_URL=https://dmhqotrkfrhimdqoftil.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<from .env.local>
```

## File Structure

```
src/
├── utils/supabase/
│   ├── client.ts      — browser client (createBrowserClient)
│   ├── server.ts      — server client (createServerClient)
│   └── middleware.ts  — session refresh (updateSession)
├── lib/
│   └── supabase.ts    — singleton helpers
├── services/
│   └── supabaseAuth.ts — full auth service
└── middleware/
    └── auth.ts         — auth guard + auto-refresh
```

## Common Patterns

### Query data
```typescript
const { data, error } = await supabase.from('expenses').select('*').eq('user_id', userId)
```

### Insert data
```typescript
const { data, error } = await supabase.from('expenses').insert({ description, amount, user_id })
```

### Auth check
```typescript
const { data: { user } } = await supabase.auth.getUser()
```

### Real-time subscription
```typescript
supabase.channel('expenses').on('postgres_changes', { event: '*', schema: 'public', table: 'expenses' }, callback).subscribe()
```

### File upload
```typescript
const { data, error } = await supabase.storage.from('receipts').upload(path, file)
```
