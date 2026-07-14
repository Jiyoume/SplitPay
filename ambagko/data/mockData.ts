import { User, Group, Expense, AppNotification } from "@/types";

export const currentUserId = "u1";

export const users: User[] = [
  { id: "u1", name: "Miguel Santos", email: "miguel@example.com", mobile: "0917 123 4567", preferredMethod: "gcash" },
  { id: "u2", name: "Ana Reyes", email: "ana@example.com", preferredMethod: "maya" },
  { id: "u3", name: "Jake Cruz", email: "jake@example.com", preferredMethod: "cash" },
  { id: "u4", name: "Liza Torres", email: "liza@example.com", preferredMethod: "bank" },
  { id: "u5", name: "Paolo Dimaano", email: "paolo@example.com", preferredMethod: "gcash" },
];

export const groups: Group[] = [
  { id: "g1", name: "Baguio Barkada Trip", category: "trip", imageColor: "#1B4B8F", memberIds: ["u1", "u2", "u3", "u4"], createdAt: "2026-06-02" },
  { id: "g2", name: "Condo Household", category: "household", imageColor: "#2E9E5B", memberIds: ["u1", "u4", "u5"], createdAt: "2026-05-10" },
  { id: "g3", name: "Office Lunch Squad", category: "meals", imageColor: "#F2994A", memberIds: ["u1", "u2", "u3", "u5"], createdAt: "2026-07-01" },
  { id: "g4", name: "Ana's Wedding Gift", category: "event", imageColor: "#FFC93C", memberIds: ["u1", "u2", "u3", "u4", "u5"], createdAt: "2026-06-20" },
];

export const expenses: Expense[] = [
  {
    id: "e1", groupId: "g1", title: "Airbnb - 2 nights", amount: 8000, date: "2026-07-05",
    category: "Lodging", paidByUserId: "u1", splitType: "equal",
    shares: [
      { userId: "u1", amount: 2000, paid: true, paymentMethod: "gcash", paidAt: "2026-07-05" },
      { userId: "u2", amount: 2000, paid: true, paymentMethod: "maya", paidAt: "2026-07-06" },
      { userId: "u3", amount: 2000, paid: false },
      { userId: "u4", amount: 2000, paid: false },
    ],
  },
  {
    id: "e2", groupId: "g1", title: "Grocery for the trip", amount: 2400, date: "2026-07-06",
    category: "Food", paidByUserId: "u2", splitType: "equal",
    shares: [
      { userId: "u1", amount: 600, paid: true, paymentMethod: "cash", paidAt: "2026-07-07" },
      { userId: "u2", amount: 600, paid: true },
      { userId: "u3", amount: 600, paid: false },
      { userId: "u4", amount: 600, paid: true, paymentMethod: "gcash", paidAt: "2026-07-08" },
    ],
  },
  {
    id: "e3", groupId: "g2", title: "Electric bill - June", amount: 3300, date: "2026-06-28",
    category: "Utilities", paidByUserId: "u4", splitType: "equal",
    shares: [
      { userId: "u1", amount: 1100, paid: false },
      { userId: "u4", amount: 1100, paid: true },
      { userId: "u5", amount: 1100, paid: true, paymentMethod: "bank", paidAt: "2026-06-29" },
    ],
  },
  {
    id: "e4", groupId: "g3", title: "Chicken inasal lunch", amount: 960, date: "2026-07-11",
    category: "Food", paidByUserId: "u1", splitType: "equal",
    shares: [
      { userId: "u1", amount: 240, paid: true },
      { userId: "u2", amount: 240, paid: true, paymentMethod: "gcash", paidAt: "2026-07-11" },
      { userId: "u3", amount: 240, paid: false },
      { userId: "u5", amount: 240, paid: false },
    ],
  },
  {
    id: "e5", groupId: "g4", title: "Gift pooled fund", amount: 5000, date: "2026-06-22",
    category: "Gift", paidByUserId: "u3", splitType: "custom",
    shares: [
      { userId: "u1", amount: 1000, paid: true, paymentMethod: "maya", paidAt: "2026-06-23" },
      { userId: "u2", amount: 1000, paid: true },
      { userId: "u3", amount: 1000, paid: true },
      { userId: "u4", amount: 1000, paid: false },
      { userId: "u5", amount: 1000, paid: false },
    ],
  },
];

export const notifications: AppNotification[] = [
  { id: "n1", type: "reminder", title: "Unpaid balance", body: "You still owe ₱2,000 for Airbnb - 2 nights in Baguio Barkada Trip.", createdAt: "2026-07-12T09:00:00", read: false },
  { id: "n2", type: "new_expense", title: "New expense added", body: "Miguel added \"Chicken inasal lunch\" to Office Lunch Squad.", createdAt: "2026-07-11T13:20:00", read: false },
  { id: "n3", type: "payment_recorded", title: "Payment recorded", body: "Liza marked her share of Electric bill - June as paid via bank transfer.", createdAt: "2026-06-29T18:05:00", read: true },
  { id: "n4", type: "reminder", title: "Unpaid balance", body: "Jake still owes ₱600 for Grocery for the trip.", createdAt: "2026-07-08T10:00:00", read: true },
];

export function userById(id: string): User | undefined {
  return users.find((u) => u.id === id);
}

export function groupById(id: string): Group | undefined {
  return groups.find((g) => g.id === id);
}

export function expensesForGroup(groupId: string): Expense[] {
  return expenses.filter((e) => e.groupId === groupId);
}

// Net balance for a user across all groups: positive = owed to them, negative = they owe.
export function netBalanceForUser(userId: string) {
  let owedToMe = 0;
  let iOwe = 0;
  for (const exp of expenses) {
    for (const share of exp.shares) {
      if (share.paid) continue;
      if (share.userId === userId && exp.paidByUserId !== userId) {
        iOwe += share.amount;
      } else if (exp.paidByUserId === userId && share.userId !== userId) {
        owedToMe += share.amount;
      }
    }
  }
  return { owedToMe, iOwe, net: owedToMe - iOwe };
}

export function groupBalance(groupId: string) {
  const groupExpenses = expensesForGroup(groupId);
  const total = groupExpenses.reduce((sum, e) => sum + e.amount, 0);
  const settled = groupExpenses.reduce(
    (sum, e) => sum + e.shares.filter((s) => s.paid).reduce((a, s) => a + s.amount, 0),
    0
  );
  return { total, settled, pending: total - settled };
}
