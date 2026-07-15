/**
 * AmbagKo - Reports & Tracker Models
 * 
 * Data models for financial tracking, monthly statements,
 * spending analytics, and expense reports.
 */

// ===== TIME PERIODS =====

export type ReportPeriod = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'custom';

export interface DateRange {
  from: string;   // ISO 8601
  to: string;     // ISO 8601
}

// ===== MONTHLY STATEMENT OF ACCOUNT =====

export interface MonthlyStatement {
  id: string;
  userId: string;
  month: number;             // 1-12
  year: number;
  generatedAt: string;       // ISO 8601

  // Summary
  openingBalance: number;
  closingBalance: number;
  totalInflows: number;      // Top-ups + received payments
  totalOutflows: number;     // Expenses + sent payments
  netChange: number;

  // Breakdown
  topUps: StatementEntry[];
  expensesPaid: StatementEntry[];
  paymentsReceived: StatementEntry[];
  paymentsSent: StatementEntry[];
  settlements: StatementEntry[];

  // Totals by category
  categoryBreakdown: CategoryTotal[];

  // Group activity
  groupSummaries: GroupStatementSummary[];

  // Balances
  outstandingOwed: number;   // Others owe you
  outstandingDebt: number;   // You owe others
  netOwed: number;           // Net position

  // Stats
  transactionCount: number;
  averageExpense: number;
  largestExpense: { description: string; amount: number; date: string };
  mostActiveGroup: { name: string; transactionCount: number };
  topCategory: { category: string; amount: number; percentage: number };
}

export interface StatementEntry {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: 'credit' | 'debit';
  category?: string;
  groupName?: string;
  counterparty?: string;     // Who you paid / who paid you
  method?: string;           // GCash, Maya, Stellar, etc.
  reference?: string;        // Transaction reference
  status: 'completed' | 'pending' | 'failed';
}

export interface CategoryTotal {
  category: string;
  icon: string;
  amount: number;
  percentage: number;
  transactionCount: number;
  trend: 'up' | 'down' | 'stable';    // vs. previous period
  trendPercentage: number;
}

export interface GroupStatementSummary {
  groupId: string;
  groupName: string;
  totalExpenses: number;
  yourShare: number;
  youPaid: number;
  youOwe: number;
  owedToYou: number;
  settled: number;
  transactionCount: number;
}

// ===== SPENDING TRACKER =====

export interface SpendingTracker {
  userId: string;
  period: ReportPeriod;
  dateRange: DateRange;

  // Budget tracking
  budgets: BudgetItem[];
  totalBudget: number;
  totalSpent: number;
  budgetRemaining: number;
  budgetUtilization: number;  // 0-1

  // Daily spending
  dailySpending: DailySpend[];
  averageDailySpend: number;
  projectedMonthlySpend: number;

  // Trends
  spendingTrend: TrendData[];
  comparedToPrevious: {
    amount: number;
    percentage: number;
    direction: 'up' | 'down' | 'same';
  };

  // Insights
  insights: SpendingInsight[];
}

export interface BudgetItem {
  category: string;
  icon: string;
  budgetAmount: number;
  spentAmount: number;
  remaining: number;
  utilization: number;       // 0-1
  isOverBudget: boolean;
  transactions: number;
}

export interface DailySpend {
  date: string;
  amount: number;
  transactionCount: number;
}

export interface TrendData {
  label: string;             // "Jan", "Week 1", "Mon", etc.
  amount: number;
  count: number;
}

export interface SpendingInsight {
  id: string;
  type: 'warning' | 'info' | 'achievement' | 'suggestion';
  icon: string;
  title: string;
  message: string;
  actionable?: boolean;
  action?: string;
}

// ===== EXPENSE REPORT =====

export interface ExpenseReport {
  id: string;
  userId: string;
  title: string;
  period: ReportPeriod;
  dateRange: DateRange;
  generatedAt: string;

  // Summary
  totalExpenses: number;
  totalGroups: number;
  totalTransactions: number;
  settledAmount: number;
  unsettledAmount: number;

  // Detailed
  entries: ReportEntry[];
  categoryBreakdown: CategoryTotal[];
  groupBreakdown: GroupReportSummary[];
  memberBalances: MemberBalance[];

  // Charts data
  spendingOverTime: TrendData[];
  categoryDistribution: { category: string; percentage: number; amount: number }[];

  // Export
  exportFormats: ('pdf' | 'csv' | 'excel')[];
}

export interface ReportEntry {
  id: string;
  date: string;
  description: string;
  amount: number;
  yourShare: number;
  paidBy: string;
  category: string;
  groupName: string;
  splitMethod: string;
  status: 'settled' | 'pending' | 'partial';
  receipt?: string;          // Receipt image URL
}

export interface GroupReportSummary {
  groupId: string;
  groupName: string;
  memberCount: number;
  totalExpenses: number;
  yourContribution: number;
  yourShare: number;
  balance: number;           // + = owed to you, - = you owe
}

export interface MemberBalance {
  userId: string;
  name: string;
  avatar?: string;
  youOwe: number;
  theyOwe: number;
  netBalance: number;
  lastSettled?: string;
}

// ===== PAYMENT HISTORY =====

export interface PaymentRecord {
  id: string;
  date: string;
  type: 'sent' | 'received' | 'topup' | 'withdrawal';
  amount: number;
  currency: string;
  counterparty: {
    userId: string;
    name: string;
  };
  method: string;
  reference: string;
  status: 'completed' | 'pending' | 'failed' | 'refunded';
  groupId?: string;
  groupName?: string;
  expenseId?: string;
  description?: string;
  stellarTxHash?: string;
}

// ===== NOTIFICATION PREFERENCES =====

export interface ReportPreferences {
  userId: string;
  autoGenerateMonthly: boolean;
  sendEmailReport: boolean;
  emailReportDay: number;          // Day of month (1-28)
  budgetAlertThreshold: number;    // 0-1 (e.g. 0.8 = alert at 80%)
  weeklyDigest: boolean;
  currency: string;
  language: string;
}
