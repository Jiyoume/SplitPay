export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  phone?: string;
}

export interface Group {
  id: string;
  name: string;
  description?: string;
  members: User[];
  createdBy: string;
  createdAt: Date;
  type: 'family' | 'friends' | 'roommates' | 'trip' | 'other';
  totalExpenses: number;
}

export interface Split {
  userId: string;
  amount: number;
  isPaid: boolean;
}

export interface Expense {
  id: string;
  groupId: string;
  description: string;
  amount: number;
  currency: string;
  category: string;
  paidBy: string;
  splits: Split[];
  splitMethod: 'equal' | 'exact' | 'percentage';
  date: Date;
  createdAt: Date;
  receipt?: string;
  notes?: string;
}

export interface Payment {
  id: string;
  groupId: string;
  fromUserId: string;
  toUserId: string;
  amount: number;
  date: Date;
  note?: string;
  settled: boolean;
}

export interface Balance {
  userId: string;
  owes: { toUserId: string; amount: number }[];
  isOwed: { fromUserId: string; amount: number }[];
  netBalance: number;
}

export interface Activity {
  id: string;
  type: 'expense_added' | 'payment_made' | 'group_created' | 'member_added';
  groupId: string;
  userId: string;
  description: string;
  amount?: number;
  date: Date;
}
