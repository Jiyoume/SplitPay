-- ============================================
-- MyShare - Supabase Database Schema
-- Run this in Supabase SQL Editor
-- Dashboard: https://supabase.com/dashboard/project/dmhqotrkfrhimdqoftil/sql
-- ============================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "moddatetime";

-- ===== USERS =====
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  avatar_url TEXT,
  kyc_level TEXT DEFAULT 'none' CHECK (kyc_level IN ('none','basic','verified','enhanced')),
  stellar_account TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===== GROUPS =====
CREATE TABLE IF NOT EXISTS groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  type TEXT DEFAULT 'other' CHECK (type IN ('family','friends','roommates','trip','meals','household','event','project','other')),
  created_by UUID REFERENCES users(id),
  total_expenses DECIMAL(12,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===== GROUP MEMBERS =====
CREATE TABLE IF NOT EXISTS group_members (
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (group_id, user_id)
);

-- ===== EXPENSES =====
CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  currency TEXT DEFAULT 'PHP',
  category TEXT DEFAULT 'other',
  paid_by UUID REFERENCES users(id),
  split_method TEXT DEFAULT 'equal' CHECK (split_method IN ('equal','exact','percentage','by_item','weighted')),
  date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes TEXT,
  receipt_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===== EXPENSE SPLITS =====
CREATE TABLE IF NOT EXISTS expense_splits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  expense_id UUID REFERENCES expenses(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  amount DECIMAL(12,2) NOT NULL,
  percentage DECIMAL(5,2),
  is_paid BOOLEAN DEFAULT FALSE,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===== PAYMENTS =====
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID REFERENCES groups(id),
  from_user_id UUID REFERENCES users(id),
  to_user_id UUID REFERENCES users(id),
  amount DECIMAL(12,2) NOT NULL,
  method TEXT,
  note TEXT,
  settled BOOLEAN DEFAULT FALSE,
  stellar_tx_hash TEXT,
  date TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===== TRANSACTIONS (TOP-UPS, WITHDRAWALS) =====
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  type TEXT NOT NULL CHECK (type IN ('topup','withdrawal','sent','received')),
  amount DECIMAL(12,2) NOT NULL,
  currency TEXT DEFAULT 'PHP',
  method TEXT,
  status TEXT DEFAULT 'completed' CHECK (status IN ('initiated','pending','processing','completed','failed','refunded')),
  reference TEXT,
  stellar_tx_hash TEXT,
  description TEXT,
  date TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===== KYC PROFILES =====
CREATE TABLE IF NOT EXISTS kyc_profiles (
  user_id UUID PRIMARY KEY REFERENCES users(id),
  status TEXT DEFAULT 'NOT_STARTED' CHECK (status IN ('NOT_STARTED','NEEDS_INFO','PROCESSING','ACCEPTED','REJECTED')),
  first_name TEXT,
  last_name TEXT,
  birth_date DATE,
  address_street TEXT,
  address_city TEXT,
  address_province TEXT,
  address_postal_code TEXT,
  address_country TEXT DEFAULT 'PHL',
  id_type TEXT,
  id_number TEXT,
  id_front_url TEXT,
  id_back_url TEXT,
  selfie_url TEXT,
  proof_of_residence_url TEXT,
  tax_id TEXT,
  occupation TEXT,
  mobile_verified BOOLEAN DEFAULT FALSE,
  email_verified BOOLEAN DEFAULT FALSE,
  identity_verified BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===== GOALS =====
CREATE TABLE IF NOT EXISTS goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  title TEXT NOT NULL,
  type TEXT DEFAULT 'savings' CHECK (type IN ('savings','debt_payoff','budget','group_settle','custom')),
  icon TEXT DEFAULT '🎯',
  target_amount DECIMAL(12,2) NOT NULL,
  current_amount DECIMAL(12,2) DEFAULT 0,
  currency TEXT DEFAULT 'PHP',
  deadline TIMESTAMPTZ,
  status TEXT DEFAULT 'active' CHECK (status IN ('active','completed','expired','cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===== POINTS =====
CREATE TABLE IF NOT EXISTS points (
  user_id UUID PRIMARY KEY REFERENCES users(id),
  total_points INTEGER DEFAULT 0,
  lifetime_points INTEGER DEFAULT 0,
  tier TEXT DEFAULT 'bronze' CHECK (tier IN ('bronze','silver','gold','platinum','diamond')),
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  referral_code TEXT UNIQUE,
  referral_count INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===== POINTS HISTORY =====
CREATE TABLE IF NOT EXISTS points_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  action TEXT NOT NULL,
  points INTEGER NOT NULL,
  context TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===== NOTIFICATIONS =====
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  title TEXT NOT NULL,
  body TEXT,
  type TEXT DEFAULT 'info',
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===== INDEXES =====
CREATE INDEX IF NOT EXISTS idx_expenses_group ON expenses(group_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date DESC);
CREATE INDEX IF NOT EXISTS idx_expense_splits_user ON expense_splits(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_from ON payments(from_user_id);
CREATE INDEX IF NOT EXISTS idx_payments_to ON payments(to_user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_goals_user ON goals(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, read);

-- ===== AUTO-UPDATE TIMESTAMPS =====
CREATE TRIGGER update_users_modtime BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);
CREATE TRIGGER update_groups_modtime BEFORE UPDATE ON groups FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);
CREATE TRIGGER update_expenses_modtime BEFORE UPDATE ON expenses FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);

-- ===== ROW LEVEL SECURITY =====
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_splits ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE kyc_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE points ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- ===== RLS POLICIES =====
-- Users can read/update own profile
CREATE POLICY "Users read own profile" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users update own profile" ON users FOR UPDATE USING (auth.uid() = id);

-- Group members can access group data
CREATE POLICY "Members read groups" ON groups FOR SELECT USING (id IN (SELECT group_id FROM group_members WHERE user_id = auth.uid()));
CREATE POLICY "Users create groups" ON groups FOR INSERT WITH CHECK (created_by = auth.uid());

-- Members can read group expenses
CREATE POLICY "Members read expenses" ON expenses FOR SELECT USING (group_id IN (SELECT group_id FROM group_members WHERE user_id = auth.uid()));
CREATE POLICY "Members add expenses" ON expenses FOR INSERT WITH CHECK (group_id IN (SELECT group_id FROM group_members WHERE user_id = auth.uid()));

-- Users see own splits
CREATE POLICY "Users read own splits" ON expense_splits FOR SELECT USING (user_id = auth.uid());

-- Users see own payments
CREATE POLICY "Users read own payments" ON payments FOR SELECT USING (from_user_id = auth.uid() OR to_user_id = auth.uid());
CREATE POLICY "Users create payments" ON payments FOR INSERT WITH CHECK (from_user_id = auth.uid());

-- Users see own transactions
CREATE POLICY "Users read own transactions" ON transactions FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users create transactions" ON transactions FOR INSERT WITH CHECK (user_id = auth.uid());

-- Users manage own KYC
CREATE POLICY "Users manage own KYC" ON kyc_profiles FOR ALL USING (user_id = auth.uid());

-- Users manage own goals
CREATE POLICY "Users manage own goals" ON goals FOR ALL USING (user_id = auth.uid());

-- Users manage own points
CREATE POLICY "Users read own points" ON points FOR SELECT USING (user_id = auth.uid());

-- Users see own notifications
CREATE POLICY "Users read own notifications" ON notifications FOR ALL USING (user_id = auth.uid());

-- ===== FUNCTION: Add Points =====
CREATE OR REPLACE FUNCTION add_points(p_user_id UUID, p_points INTEGER, p_action TEXT)
RETURNS VOID AS $$
BEGIN
  INSERT INTO points (user_id, total_points, lifetime_points, referral_code)
  VALUES (p_user_id, p_points, p_points, 'MYSHARE' || SUBSTRING(p_user_id::TEXT, 1, 6))
  ON CONFLICT (user_id) DO UPDATE SET
    total_points = points.total_points + p_points,
    lifetime_points = points.lifetime_points + p_points,
    updated_at = NOW();

  INSERT INTO points_history (user_id, action, points) VALUES (p_user_id, p_action, p_points);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
