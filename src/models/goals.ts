/**
 * AmbagKo - Goals & Bonus Points System
 * 
 * Gamification layer that motivates users to:
 * - Save money through spending goals
 * - Settle debts on time
 * - Be active in groups
 * - Complete KYC verification
 * - Maintain good financial habits
 */

// ===== POINTS SYSTEM =====

export type PointAction =
  | 'expense_added'         // Added an expense
  | 'expense_settled'       // Settled a debt
  | 'on_time_payment'       // Paid before deadline
  | 'receipt_scanned'       // Used OCR scanner
  | 'group_created'         // Created a group
  | 'member_invited'        // Invited someone
  | 'kyc_basic'             // Completed basic KYC
  | 'kyc_verified'          // Completed verified KYC
  | 'kyc_enhanced'          // Completed enhanced KYC
  | 'first_topup'           // First wallet top-up
  | 'streak_3_day'          // 3-day activity streak
  | 'streak_7_day'          // 7-day streak
  | 'streak_30_day'         // 30-day streak
  | 'budget_under'          // Stayed under budget
  | 'goal_completed'        // Completed a savings goal
  | 'referral_signup'       // Referred user signed up
  | 'referral_active'       // Referred user made first transaction
  | 'no_debt_month'         // Ended month with zero debts
  | 'early_settler'         // Settled within 24h
  | 'group_fully_settled'   // Entire group settled up
  | 'daily_login';          // Daily app open

export interface PointRule {
  action: PointAction;
  points: number;
  label: string;
  icon: string;
  description: string;
  maxPerDay?: number;       // Rate limit
  oneTime?: boolean;        // Can only earn once
}

export const POINT_RULES: PointRule[] = [
  { action: 'expense_added', points: 5, label: 'Expense Logged', icon: '🧾', description: 'Added a new expense', maxPerDay: 10 },
  { action: 'expense_settled', points: 15, label: 'Debt Settled', icon: '✅', description: 'Settled an outstanding debt', maxPerDay: 5 },
  { action: 'on_time_payment', points: 25, label: 'On-Time Payer', icon: '⏰', description: 'Paid before the deadline' },
  { action: 'early_settler', points: 30, label: 'Early Bird', icon: '🐦', description: 'Settled within 24 hours' },
  { action: 'receipt_scanned', points: 10, label: 'Scanner Pro', icon: '📸', description: 'Scanned a receipt with OCR', maxPerDay: 5 },
  { action: 'group_created', points: 20, label: 'Group Leader', icon: '👥', description: 'Created a new group' },
  { action: 'member_invited', points: 10, label: 'Team Builder', icon: '📨', description: 'Invited a member to a group', maxPerDay: 5 },
  { action: 'kyc_basic', points: 50, label: 'Verified (Basic)', icon: '🛡️', description: 'Completed basic KYC', oneTime: true },
  { action: 'kyc_verified', points: 100, label: 'Fully Verified', icon: '🏆', description: 'Completed full ID verification', oneTime: true },
  { action: 'kyc_enhanced', points: 200, label: 'Elite Verified', icon: '💎', description: 'Completed enhanced KYC', oneTime: true },
  { action: 'first_topup', points: 50, label: 'Wallet Funded', icon: '💰', description: 'First wallet top-up', oneTime: true },
  { action: 'streak_3_day', points: 15, label: '3-Day Streak', icon: '🔥', description: '3 consecutive active days' },
  { action: 'streak_7_day', points: 50, label: 'Weekly Warrior', icon: '⚡', description: '7 consecutive active days' },
  { action: 'streak_30_day', points: 200, label: 'Monthly Master', icon: '🌟', description: '30 consecutive active days' },
  { action: 'budget_under', points: 30, label: 'Budget Hero', icon: '💪', description: 'Stayed under monthly budget' },
  { action: 'goal_completed', points: 50, label: 'Goal Achieved', icon: '🎯', description: 'Completed a savings goal' },
  { action: 'referral_signup', points: 100, label: 'Referrer', icon: '🤝', description: 'Referred someone who signed up', oneTime: false },
  { action: 'referral_active', points: 150, label: 'Influencer', icon: '⭐', description: 'Referred user made first transaction' },
  { action: 'no_debt_month', points: 75, label: 'Debt Free', icon: '🎉', description: 'Ended month with zero debts' },
  { action: 'group_fully_settled', points: 40, label: 'Group Cleared', icon: '🏁', description: 'All debts settled in a group' },
  { action: 'daily_login', points: 2, label: 'Daily Check-in', icon: '📱', description: 'Opened the app today', maxPerDay: 1 },
];

// ===== TIERS / LEVELS =====

export type UserTier = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';

export interface TierInfo {
  tier: UserTier;
  name: string;
  icon: string;
  minPoints: number;
  maxPoints: number;
  perks: string[];
  color: string;
}

export const TIERS: TierInfo[] = [
  { tier: 'bronze', name: 'Bronze', icon: '🥉', minPoints: 0, maxPoints: 499, color: '#CD7F32', perks: ['Basic features', 'Standard limits'] },
  { tier: 'silver', name: 'Silver', icon: '🥈', minPoints: 500, maxPoints: 1999, color: '#C0C0C0', perks: ['Priority support', '10% lower fees', 'Custom group themes'] },
  { tier: 'gold', name: 'Gold', icon: '🥇', minPoints: 2000, maxPoints: 4999, color: '#FFD700', perks: ['20% lower fees', 'Advanced reports', 'Unlimited groups', 'Export PDF'] },
  { tier: 'platinum', name: 'Platinum', icon: '💎', minPoints: 5000, maxPoints: 14999, color: '#E5E4E2', perks: ['30% lower fees', 'Dedicated support', 'API access', 'Custom budgets'] },
  { tier: 'diamond', name: 'Diamond', icon: '👑', minPoints: 15000, maxPoints: Infinity, color: '#B9F2FF', perks: ['Zero fees', 'VIP support', 'Beta features', 'Referral bonuses 2x'] },
];

// ===== SAVINGS GOALS =====

export type GoalStatus = 'active' | 'completed' | 'expired' | 'cancelled';
export type GoalType = 'savings' | 'debt_payoff' | 'budget' | 'group_settle' | 'custom';

export interface SavingsGoal {
  id: string;
  userId: string;
  title: string;
  description?: string;
  type: GoalType;
  icon: string;
  targetAmount: number;
  currentAmount: number;
  currency: string;
  startDate: string;
  deadline: string;
  status: GoalStatus;
  progress: number;           // 0-1
  milestones: GoalMilestone[];
  contributions: GoalContribution[];
  createdAt: string;
  completedAt?: string;
  pointsEarned: number;
}

export interface GoalMilestone {
  id: string;
  percentage: number;         // e.g. 25, 50, 75, 100
  reached: boolean;
  reachedAt?: string;
  reward: number;             // Bonus points
  label: string;
}

export interface GoalContribution {
  id: string;
  amount: number;
  date: string;
  source: string;             // "manual" | "auto_savings" | "cashback"
}

// ===== USER POINTS PROFILE =====

export interface UserPointsProfile {
  userId: string;
  totalPoints: number;
  lifetimePoints: number;
  tier: UserTier;
  currentStreak: number;      // Days
  longestStreak: number;
  goalsCompleted: number;
  goalsActive: number;
  pointsHistory: PointEntry[];
  achievements: Achievement[];
  referralCode: string;
  referralCount: number;
}

export interface PointEntry {
  id: string;
  action: PointAction;
  points: number;
  label: string;
  icon: string;
  date: string;
  context?: string;           // e.g. "Group: Baguio Trip"
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlockedAt: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  points: number;
}

// ===== REWARDS CATALOG =====

export interface Reward {
  id: string;
  title: string;
  description: string;
  icon: string;
  pointsCost: number;
  type: 'fee_discount' | 'cashback' | 'feature_unlock' | 'partner_voucher';
  value: string;              // e.g. "₱50 off", "1 month premium"
  available: boolean;
  tierRequired: UserTier;
  expiresAt?: string;
}

export const REWARDS_CATALOG: Reward[] = [
  { id: 'r1', title: '₱25 Fee Waiver', description: 'Next bank transfer fee waived', icon: '🎟️', pointsCost: 100, type: 'fee_discount', value: '₱25', available: true, tierRequired: 'bronze' },
  { id: 'r2', title: '₱50 Cashback', description: 'On your next top-up', icon: '💸', pointsCost: 250, type: 'cashback', value: '₱50', available: true, tierRequired: 'silver' },
  { id: 'r3', title: 'Premium Reports', description: '1 month of advanced analytics', icon: '📊', pointsCost: 500, type: 'feature_unlock', value: '1 month', available: true, tierRequired: 'silver' },
  { id: 'r4', title: 'GCash ₱100 Voucher', description: 'Redeem to your GCash', icon: '💚', pointsCost: 1000, type: 'partner_voucher', value: '₱100', available: true, tierRequired: 'gold' },
  { id: 'r5', title: 'Zero Fees for 1 Week', description: 'All transaction fees waived', icon: '✨', pointsCost: 2000, type: 'fee_discount', value: '7 days', available: true, tierRequired: 'gold' },
  { id: 'r6', title: '₱500 Cashback', description: 'Added to your wallet', icon: '🎁', pointsCost: 5000, type: 'cashback', value: '₱500', available: true, tierRequired: 'platinum' },
];
