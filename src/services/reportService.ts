/**
 * AmbagKo - Reports & Tracker Service
 * 
 * Generates financial reports, spending analytics, monthly statements,
 * and budget tracking for users.
 */

import {
  MonthlyStatement, StatementEntry, CategoryTotal, GroupStatementSummary,
  SpendingTracker, BudgetItem, DailySpend, TrendData, SpendingInsight,
  ExpenseReport, ReportEntry, PaymentRecord, DateRange, ReportPeriod, ReportPreferences,
} from '../models/reports';
import { Expense, Group, Payment } from '../models/types';

const CATEGORY_ICONS: Record<string, string> = {
  food_dining:'🍜', groceries:'🛒', transport:'🚐', utilities:'⚡',
  entertainment:'🎬', shopping:'🛍️', healthcare:'💊', travel:'✈️',
  rent_housing:'🏠', education:'📚', gifts:'🎁', other:'📦',
};

// ===== MONTHLY STATEMENT =====

export function generateMonthlyStatement(
  userId: string, month: number, year: number,
  expenses: Expense[], payments: Payment[], groups: Group[],
  topUpHistory: PaymentRecord[], previousBalance: number = 0
): MonthlyStatement {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);

  const monthExpenses = expenses.filter(e => { const d = new Date(e.date); return d >= startDate && d <= endDate; });
  const monthPayments = payments.filter(p => { const d = new Date(p.date); return d >= startDate && d <= endDate; });
  const monthTopUps = topUpHistory.filter(t => { const d = new Date(t.date); return d >= startDate && d <= endDate && t.type === 'topup'; });

  const topUpEntries: StatementEntry[] = monthTopUps.map(t => ({
    id: t.id, date: t.date, description: `Top-up via ${t.method}`,
    amount: t.amount, type: 'credit', method: t.method, reference: t.reference, status: t.status as any,
  }));

  const expensePaidEntries: StatementEntry[] = monthExpenses.filter(e => e.paidBy === userId).map(e => ({
    id: e.id, date: new Date(e.date).toISOString(), description: e.description,
    amount: e.amount, type: 'debit', category: e.category,
    groupName: groups.find(g => g.id === e.groupId)?.name, status: 'completed',
  }));

  const paymentsReceivedEntries: StatementEntry[] = monthPayments.filter(p => p.toUserId === userId).map(p => ({
    id: p.id, date: new Date(p.date).toISOString(), description: `Payment received${p.note ? ': ' + p.note : ''}`,
    amount: p.amount, type: 'credit', groupName: groups.find(g => g.id === p.groupId)?.name,
    counterparty: p.fromUserId, status: 'completed',
  }));

  const paymentsSentEntries: StatementEntry[] = monthPayments.filter(p => p.fromUserId === userId).map(p => ({
    id: p.id, date: new Date(p.date).toISOString(), description: `Payment sent${p.note ? ': ' + p.note : ''}`,
    amount: p.amount, type: 'debit', groupName: groups.find(g => g.id === p.groupId)?.name,
    counterparty: p.toUserId, status: 'completed',
  }));

  const totalInflows = topUpEntries.reduce((s, e) => s + e.amount, 0) + paymentsReceivedEntries.reduce((s, e) => s + e.amount, 0);
  const totalOutflows = expensePaidEntries.reduce((s, e) => s + e.amount, 0) + paymentsSentEntries.reduce((s, e) => s + e.amount, 0);
  const netChange = totalInflows - totalOutflows;
  const closingBalance = previousBalance + netChange;

  // Category breakdown
  const categoryMap: Record<string, { amount: number; count: number }> = {};
  monthExpenses.forEach(e => {
    const cat = e.category || 'other';
    if (!categoryMap[cat]) categoryMap[cat] = { amount: 0, count: 0 };
    const userShare = e.splits.find(s => s.userId === userId)?.amount || 0;
    categoryMap[cat].amount += userShare;
    categoryMap[cat].count++;
  });
  const totalCatAmount = Object.values(categoryMap).reduce((s, c) => s + c.amount, 0);
  const categoryBreakdown: CategoryTotal[] = Object.entries(categoryMap)
    .map(([cat, data]) => ({
      category: cat, icon: CATEGORY_ICONS[cat] || '📦',
      amount: Math.round(data.amount * 100) / 100,
      percentage: totalCatAmount > 0 ? Math.round((data.amount / totalCatAmount) * 10000) / 100 : 0,
      transactionCount: data.count, trend: 'stable' as const, trendPercentage: 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  // Group summaries
  const groupSummaries: GroupStatementSummary[] = groups.map(group => {
    const ge = monthExpenses.filter(e => e.groupId === group.id);
    const totalExp = ge.reduce((s, e) => s + e.amount, 0);
    const yourShare = ge.reduce((s, e) => s + (e.splits.find(sp => sp.userId === userId)?.amount || 0), 0);
    const youPaid = ge.filter(e => e.paidBy === userId).reduce((s, e) => s + e.amount, 0);
    return {
      groupId: group.id, groupName: group.name, totalExpenses: totalExp,
      yourShare, youPaid, youOwe: Math.max(0, yourShare - youPaid),
      owedToYou: Math.max(0, youPaid - yourShare),
      settled: monthPayments.filter(p => p.groupId === group.id && p.settled).reduce((s, p) => s + p.amount, 0),
      transactionCount: ge.length,
    };
  }).filter(g => g.transactionCount > 0);

  const outstandingOwed = groupSummaries.reduce((s, g) => s + g.owedToYou, 0);
  const outstandingDebt = groupSummaries.reduce((s, g) => s + g.youOwe, 0);
  const transactionCount = monthExpenses.length + monthPayments.length;
  const allAmounts = monthExpenses.map(e => e.splits.find(s => s.userId === userId)?.amount || 0).filter(a => a > 0);
  const averageExpense = allAmounts.length > 0 ? allAmounts.reduce((s, a) => s + a, 0) / allAmounts.length : 0;
  const maxAmt = Math.max(...allAmounts, 0);
  const largestIdx = allAmounts.indexOf(maxAmt);
  const largestExpense = largestIdx >= 0
    ? { description: monthExpenses[largestIdx]?.description || '', amount: maxAmt, date: new Date(monthExpenses[largestIdx].date).toISOString() }
    : { description: 'None', amount: 0, date: '' };
  const mostActiveGroup = groupSummaries.length > 0
    ? groupSummaries.reduce((max, g) => g.transactionCount > max.transactionCount ? g : max)
    : { groupName: 'None', transactionCount: 0 };
  const topCategory = categoryBreakdown[0] || { category: 'None', amount: 0, percentage: 0 };

  return {
    id: `soa_${year}_${String(month).padStart(2, '0')}_${userId}`,
    userId, month, year, generatedAt: new Date().toISOString(),
    openingBalance: previousBalance, closingBalance, totalInflows, totalOutflows, netChange,
    topUps: topUpEntries, expensesPaid: expensePaidEntries,
    paymentsReceived: paymentsReceivedEntries, paymentsSent: paymentsSentEntries,
    settlements: paymentsSentEntries.filter(e => e.description.includes('settle')),
    categoryBreakdown, groupSummaries, outstandingOwed, outstandingDebt,
    netOwed: outstandingOwed - outstandingDebt, transactionCount,
    averageExpense: Math.round(averageExpense * 100) / 100, largestExpense,
    mostActiveGroup: { name: mostActiveGroup.groupName, transactionCount: mostActiveGroup.transactionCount },
    topCategory: { category: topCategory.category, amount: topCategory.amount, percentage: topCategory.percentage },
  };
}

// ===== SPENDING TRACKER =====

export function generateSpendingTracker(
  userId: string, period: ReportPeriod, dateRange: DateRange,
  expenses: Expense[], budgets: Record<string, number>
): SpendingTracker {
  const start = new Date(dateRange.from);
  const end = new Date(dateRange.to);
  const periodExpenses = expenses.filter(e => { const d = new Date(e.date); return d >= start && d <= end; });

  const categorySpending: Record<string, number> = {};
  const categoryCount: Record<string, number> = {};
  periodExpenses.forEach(e => {
    const cat = e.category || 'other';
    const userShare = e.splits.find(s => s.userId === userId)?.amount || 0;
    categorySpending[cat] = (categorySpending[cat] || 0) + userShare;
    categoryCount[cat] = (categoryCount[cat] || 0) + 1;
  });

  const budgetItems: BudgetItem[] = Object.entries(budgets).map(([category, budgetAmount]) => {
    const spent = categorySpending[category] || 0;
    return {
      category, icon: CATEGORY_ICONS[category] || '📦', budgetAmount,
      spentAmount: Math.round(spent * 100) / 100,
      remaining: Math.round((budgetAmount - spent) * 100) / 100,
      utilization: budgetAmount > 0 ? spent / budgetAmount : 0,
      isOverBudget: spent > budgetAmount, transactions: categoryCount[category] || 0,
    };
  });

  const totalBudget = budgetItems.reduce((s, b) => s + b.budgetAmount, 0);
  const totalSpent = budgetItems.reduce((s, b) => s + b.spentAmount, 0);

  // Daily spending
  const dailyMap: Record<string, { amount: number; count: number }> = {};
  periodExpenses.forEach(e => {
    const day = new Date(e.date).toISOString().split('T')[0];
    const userShare = e.splits.find(s => s.userId === userId)?.amount || 0;
    if (!dailyMap[day]) dailyMap[day] = { amount: 0, count: 0 };
    dailyMap[day].amount += userShare;
    dailyMap[day].count++;
  });
  const dailySpending: DailySpend[] = Object.entries(dailyMap)
    .map(([date, data]) => ({ date, amount: Math.round(data.amount * 100) / 100, transactionCount: data.count }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const totalDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
  const averageDailySpend = totalSpent / totalDays;

  // Weekly trend
  const spendingTrend: TrendData[] = [];
  let weekStart = new Date(start); let weekNum = 1;
  while (weekStart <= end) {
    const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);
    const weekTotal = periodExpenses.filter(e => { const d = new Date(e.date); return d >= weekStart && d < weekEnd; })
      .reduce((s, e) => s + (e.splits.find(sp => sp.userId === userId)?.amount || 0), 0);
    spendingTrend.push({ label: `Week ${weekNum}`, amount: Math.round(weekTotal * 100) / 100, count: 0 });
    weekStart = weekEnd; weekNum++;
  }

  // Insights
  const insights = generateInsights(budgetItems, dailySpending, totalSpent, averageDailySpend);

  return {
    userId, period, dateRange, budgets: budgetItems, totalBudget,
    totalSpent: Math.round(totalSpent * 100) / 100,
    budgetRemaining: Math.round((totalBudget - totalSpent) * 100) / 100,
    budgetUtilization: totalBudget > 0 ? totalSpent / totalBudget : 0,
    dailySpending, averageDailySpend: Math.round(averageDailySpend * 100) / 100,
    projectedMonthlySpend: Math.round(averageDailySpend * 30 * 100) / 100,
    spendingTrend, comparedToPrevious: { amount: 0, percentage: 0, direction: 'same' }, insights,
  };
}

function generateInsights(budgets: BudgetItem[], daily: DailySpend[], totalSpent: number, avgDaily: number): SpendingInsight[] {
  const insights: SpendingInsight[] = [];
  budgets.filter(b => b.isOverBudget).forEach(b => {
    insights.push({ id: `over_${b.category}`, type: 'warning', icon: '⚠️', title: `${b.icon} ${b.category} over budget`, message: `Spent ₱${b.spentAmount.toLocaleString()} of ₱${b.budgetAmount.toLocaleString()} (${Math.round(b.utilization * 100)}%).`, actionable: true, action: 'Review' });
  });
  budgets.filter(b => !b.isOverBudget && b.utilization >= 0.8).forEach(b => {
    insights.push({ id: `near_${b.category}`, type: 'warning', icon: '🔔', title: `${b.icon} Approaching limit`, message: `₱${b.remaining.toLocaleString()} remaining in ${b.category}.` });
  });
  if (daily.length > 0) {
    const maxDay = daily.reduce((max, d) => d.amount > max.amount ? d : max);
    if (maxDay.amount > avgDaily * 3) {
      insights.push({ id: 'high_day', type: 'info', icon: '📈', title: 'High spending day', message: `₱${maxDay.amount.toLocaleString()} on ${maxDay.date} — ${Math.round(maxDay.amount / avgDaily)}x your average.` });
    }
  }
  const saved = budgets.filter(b => b.utilization < 0.5 && b.budgetAmount > 0);
  if (saved.length > 0) {
    insights.push({ id: 'savings', type: 'achievement', icon: '🎉', title: 'Great savings!', message: `Under budget in ${saved.length} categories.` });
  }
  return insights;
}

// ===== EXPENSE REPORT =====

export function generateExpenseReport(
  userId: string, title: string, period: ReportPeriod, dateRange: DateRange,
  expenses: Expense[], groups: Group[]
): ExpenseReport {
  const start = new Date(dateRange.from);
  const end = new Date(dateRange.to);
  const filtered = expenses.filter(e => { const d = new Date(e.date); return d >= start && d <= end; });

  const entries: ReportEntry[] = filtered.map(e => ({
    id: e.id, date: new Date(e.date).toISOString(), description: e.description,
    amount: e.amount, yourShare: e.splits.find(s => s.userId === userId)?.amount || 0,
    paidBy: e.paidBy, category: e.category,
    groupName: groups.find(g => g.id === e.groupId)?.name || 'Unknown',
    splitMethod: e.splitMethod, status: (e.splits.find(s => s.userId === userId)?.isPaid ? 'settled' : 'pending') as any,
  }));

  const totalExpenses = entries.reduce((s, e) => s + e.yourShare, 0);
  const settledAmount = entries.filter(e => e.status === 'settled').reduce((s, e) => s + e.yourShare, 0);

  const catMap: Record<string, number> = {};
  entries.forEach(e => { catMap[e.category] = (catMap[e.category] || 0) + e.yourShare; });

  return {
    id: `report_${Date.now()}`, userId, title, period, dateRange,
    generatedAt: new Date().toISOString(),
    totalExpenses: Math.round(totalExpenses * 100) / 100,
    totalGroups: new Set(entries.map(e => e.groupName)).size,
    totalTransactions: entries.length,
    settledAmount: Math.round(settledAmount * 100) / 100,
    unsettledAmount: Math.round((totalExpenses - settledAmount) * 100) / 100,
    entries,
    categoryBreakdown: Object.entries(catMap).map(([cat, amt]) => ({
      category: cat, icon: CATEGORY_ICONS[cat] || '📦', amount: amt,
      percentage: totalExpenses > 0 ? Math.round((amt / totalExpenses) * 10000) / 100 : 0,
      transactionCount: entries.filter(e => e.category === cat).length,
      trend: 'stable' as const, trendPercentage: 0,
    })).sort((a, b) => b.amount - a.amount),
    groupBreakdown: [], memberBalances: [],
    spendingOverTime: [], categoryDistribution: Object.entries(catMap).map(([cat, amt]) => ({
      category: cat, amount: amt, percentage: totalExpenses > 0 ? Math.round((amt / totalExpenses) * 10000) / 100 : 0,
    })),
    exportFormats: ['pdf', 'csv', 'excel'],
  };
}

// ===== CSV EXPORT =====

export function exportStatementToCSV(statement: MonthlyStatement): string {
  const headers = 'Date,Description,Type,Amount (PHP),Category,Group,Status';
  const allEntries = [...statement.topUps, ...statement.expensesPaid, ...statement.paymentsReceived, ...statement.paymentsSent]
    .sort((a, b) => a.date.localeCompare(b.date));
  const rows = allEntries.map(e => [
    new Date(e.date).toLocaleDateString('en-PH'), `"${e.description}"`, e.type,
    e.type === 'credit' ? `+${e.amount.toFixed(2)}` : `-${e.amount.toFixed(2)}`,
    e.category || '', e.groupName || '', e.status,
  ].join(','));
  const summary = ['', `Opening Balance,,,${statement.openingBalance.toFixed(2)}`,
    `Total Inflows,,,+${statement.totalInflows.toFixed(2)}`, `Total Outflows,,,-${statement.totalOutflows.toFixed(2)}`,
    `Closing Balance,,,${statement.closingBalance.toFixed(2)}`, '',
    `Owed to You,,,${statement.outstandingOwed.toFixed(2)}`, `You Owe,,,-${statement.outstandingDebt.toFixed(2)}`];
  return [headers, ...rows, ...summary].join('\n');
}

export function getDefaultPreferences(userId: string): ReportPreferences {
  return { userId, autoGenerateMonthly: true, sendEmailReport: true, emailReportDay: 1, budgetAlertThreshold: 0.8, weeklyDigest: true, currency: 'PHP', language: 'en' };
}
