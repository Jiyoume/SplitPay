/**
 * AmbagKo - Goals & Points Service
 * 
 * Manages savings goals, point accumulation, tier progression,
 * streak tracking, and reward redemption.
 */

import {
  PointAction, PointRule, POINT_RULES, UserTier, TIERS, TierInfo,
  SavingsGoal, GoalMilestone, GoalContribution, UserPointsProfile,
  PointEntry, Achievement, Reward, REWARDS_CATALOG, GoalType,
} from '../models/goals';

// ===== POINTS ENGINE =====

/**
 * Award points for an action.
 */
export function awardPoints(
  profile: UserPointsProfile,
  action: PointAction,
  context?: string
): { profile: UserPointsProfile; pointsAwarded: number; newTier?: UserTier } {
  const rule = POINT_RULES.find(r => r.action === action);
  if (!rule) return { profile, pointsAwarded: 0 };

  // Check one-time rules
  if (rule.oneTime && profile.pointsHistory.some(p => p.action === action)) {
    return { profile, pointsAwarded: 0 };
  }

  // Check daily rate limit
  if (rule.maxPerDay) {
    const today = new Date().toISOString().split('T')[0];
    const todayCount = profile.pointsHistory.filter(p => p.action === action && p.date.startsWith(today)).length;
    if (todayCount >= rule.maxPerDay) return { profile, pointsAwarded: 0 };
  }

  // Award
  const entry: PointEntry = {
    id: `pt_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    action, points: rule.points, label: rule.label, icon: rule.icon,
    date: new Date().toISOString(), context,
  };

  const updatedProfile = {
    ...profile,
    totalPoints: profile.totalPoints + rule.points,
    lifetimePoints: profile.lifetimePoints + rule.points,
    pointsHistory: [entry, ...profile.pointsHistory].slice(0, 200),
  };

  // Check tier upgrade
  const oldTier = profile.tier;
  const newTier = calculateTier(updatedProfile.totalPoints);
  updatedProfile.tier = newTier;

  return {
    profile: updatedProfile,
    pointsAwarded: rule.points,
    newTier: newTier !== oldTier ? newTier : undefined,
  };
}

/**
 * Calculate tier from total points.
 */
export function calculateTier(points: number): UserTier {
  for (let i = TIERS.length - 1; i >= 0; i--) {
    if (points >= TIERS[i].minPoints) return TIERS[i].tier;
  }
  return 'bronze';
}

/**
 * Get tier info for display.
 */
export function getTierInfo(tier: UserTier): TierInfo {
  return TIERS.find(t => t.tier === tier) || TIERS[0];
}

/**
 * Get progress toward next tier.
 */
export function getTierProgress(points: number): { current: TierInfo; next: TierInfo | null; progress: number; pointsNeeded: number } {
  const currentTier = TIERS.find(t => points >= t.minPoints && points <= t.maxPoints) || TIERS[0];
  const currentIdx = TIERS.indexOf(currentTier);
  const nextTier = currentIdx < TIERS.length - 1 ? TIERS[currentIdx + 1] : null;

  if (!nextTier) return { current: currentTier, next: null, progress: 1, pointsNeeded: 0 };

  const range = nextTier.minPoints - currentTier.minPoints;
  const earned = points - currentTier.minPoints;
  return {
    current: currentTier,
    next: nextTier,
    progress: Math.min(1, earned / range),
    pointsNeeded: nextTier.minPoints - points,
  };
}

// ===== STREAK TRACKING =====

/**
 * Update daily streak.
 */
export function updateStreak(profile: UserPointsProfile, lastActiveDate?: string): UserPointsProfile {
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  if (lastActiveDate === today) return profile; // Already counted today

  let newStreak = profile.currentStreak;
  if (lastActiveDate === yesterday) {
    newStreak += 1;
  } else if (lastActiveDate !== today) {
    newStreak = 1; // Reset streak
  }

  const longestStreak = Math.max(profile.longestStreak, newStreak);

  // Award streak bonuses
  let updated = { ...profile, currentStreak: newStreak, longestStreak };
  if (newStreak === 3) updated = awardPoints(updated, 'streak_3_day').profile;
  if (newStreak === 7) updated = awardPoints(updated, 'streak_7_day').profile;
  if (newStreak === 30) updated = awardPoints(updated, 'streak_30_day').profile;

  return updated;
}

// ===== SAVINGS GOALS =====

/**
 * Create a new savings goal.
 */
export function createGoal(
  userId: string,
  title: string,
  targetAmount: number,
  deadline: string,
  type: GoalType = 'savings',
  icon: string = '🎯'
): SavingsGoal {
  const milestones: GoalMilestone[] = [25, 50, 75, 100].map((pct, i) => ({
    id: `ms_${i}`,
    percentage: pct,
    reached: false,
    reward: pct === 100 ? 50 : pct === 75 ? 20 : 10,
    label: pct === 100 ? 'Goal Complete!' : `${pct}% reached`,
  }));

  return {
    id: `goal_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    userId, title, type, icon,
    targetAmount, currentAmount: 0, currency: 'PHP',
    startDate: new Date().toISOString(),
    deadline, status: 'active', progress: 0,
    milestones, contributions: [],
    createdAt: new Date().toISOString(), pointsEarned: 0,
  };
}

/**
 * Add a contribution to a goal.
 */
export function contributeToGoal(
  goal: SavingsGoal,
  amount: number,
  source: string = 'manual'
): { goal: SavingsGoal; milestonesReached: GoalMilestone[]; pointsEarned: number } {
  const newAmount = goal.currentAmount + amount;
  const newProgress = Math.min(1, newAmount / goal.targetAmount);
  const newMilestonesReached: GoalMilestone[] = [];
  let pointsEarned = 0;

  const contribution: GoalContribution = {
    id: `contrib_${Date.now()}`,
    amount, date: new Date().toISOString(), source,
  };

  // Check milestones
  const updatedMilestones = goal.milestones.map(ms => {
    if (!ms.reached && newProgress >= ms.percentage / 100) {
      newMilestonesReached.push(ms);
      pointsEarned += ms.reward;
      return { ...ms, reached: true, reachedAt: new Date().toISOString() };
    }
    return ms;
  });

  // Check completion
  const isComplete = newAmount >= goal.targetAmount;

  return {
    goal: {
      ...goal,
      currentAmount: newAmount,
      progress: newProgress,
      milestones: updatedMilestones,
      contributions: [...goal.contributions, contribution],
      status: isComplete ? 'completed' : 'active',
      completedAt: isComplete ? new Date().toISOString() : undefined,
      pointsEarned: goal.pointsEarned + pointsEarned,
    },
    milestonesReached: newMilestonesReached,
    pointsEarned,
  };
}

/**
 * Check for expired goals.
 */
export function checkExpiredGoals(goals: SavingsGoal[]): SavingsGoal[] {
  const now = new Date().toISOString();
  return goals.map(g => {
    if (g.status === 'active' && g.deadline < now) {
      return { ...g, status: 'expired' as const };
    }
    return g;
  });
}

// ===== REWARDS =====

/**
 * Get available rewards for a user's tier.
 */
export function getAvailableRewards(tier: UserTier, points: number): Reward[] {
  const tierOrder: UserTier[] = ['bronze', 'silver', 'gold', 'platinum', 'diamond'];
  const userTierIdx = tierOrder.indexOf(tier);
  return REWARDS_CATALOG.filter(r => {
    const requiredIdx = tierOrder.indexOf(r.tierRequired);
    return requiredIdx <= userTierIdx && r.pointsCost <= points && r.available;
  });
}

/**
 * Redeem a reward.
 */
export function redeemReward(
  profile: UserPointsProfile,
  rewardId: string
): { profile: UserPointsProfile; reward: Reward | null; error?: string } {
  const reward = REWARDS_CATALOG.find(r => r.id === rewardId);
  if (!reward) return { profile, reward: null, error: 'Reward not found' };
  if (reward.pointsCost > profile.totalPoints) return { profile, reward: null, error: 'Not enough points' };

  const updated = {
    ...profile,
    totalPoints: profile.totalPoints - reward.pointsCost,
  };

  return { profile: updated, reward };
}

// ===== INITIALIZE =====

/**
 * Create a new user points profile.
 */
export function createPointsProfile(userId: string): UserPointsProfile {
  return {
    userId,
    totalPoints: 0,
    lifetimePoints: 0,
    tier: 'bronze',
    currentStreak: 0,
    longestStreak: 0,
    goalsCompleted: 0,
    goalsActive: 0,
    pointsHistory: [],
    achievements: [],
    referralCode: `AMBAG${userId.slice(0, 6).toUpperCase()}`,
    referralCount: 0,
  };
}

/**
 * Get summary for display.
 */
export function getPointsSummary(profile: UserPointsProfile) {
  const tierProgress = getTierProgress(profile.totalPoints);
  const tierInfo = getTierInfo(profile.tier);
  return {
    points: profile.totalPoints,
    tier: tierInfo,
    streak: profile.currentStreak,
    progress: tierProgress,
    recentPoints: profile.pointsHistory.slice(0, 5),
    availableRewards: getAvailableRewards(profile.tier, profile.totalPoints).length,
  };
}
