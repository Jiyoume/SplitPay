export type PaymentMethod = "cash" | "bank" | "gcash" | "maya" | "other";

export type GroupCategory =
  | "trip"
  | "meals"
  | "household"
  | "event"
  | "project";

export interface User {
  id: string;
  name: string;
  email: string;
  mobile?: string;
  photoUrl?: string;
  preferredMethod?: PaymentMethod;
}

export interface GroupMember {
  userId: string;
  balance: number; // positive = owed to them, negative = they owe
}

export interface Group {
  id: string;
  name: string;
  category: GroupCategory;
  imageColor: string;
  memberIds: string[];
  createdAt: string;
}

export type SplitType = "equal" | "percentage" | "exact" | "custom";

export interface ExpenseShare {
  userId: string;
  amount: number;
  paid: boolean;
  paymentMethod?: PaymentMethod;
  paidAt?: string;
}

export interface Expense {
  id: string;
  groupId: string;
  title: string;
  amount: number;
  date: string;
  category: string;
  paidByUserId: string;
  splitType: SplitType;
  shares: ExpenseShare[];
  note?: string;
  receiptUrl?: string;
}

export interface AppNotification {
  id: string;
  type: "reminder" | "new_expense" | "payment_recorded";
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
}
