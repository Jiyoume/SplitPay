import { Group, Expense, Payment, User } from '../models/types';

// Mock storage service - replace with AsyncStorage or backend API
class StorageService {
  private groups: Group[] = [];
  private expenses: Expense[] = [];
  private payments: Payment[] = [];

  async getGroups(): Promise<Group[]> {
    return this.groups;
  }

  async getGroupById(id: string): Promise<Group | undefined> {
    return this.groups.find((g) => g.id === id);
  }

  async createGroup(group: Group): Promise<Group> {
    this.groups.push(group);
    return group;
  }

  async getExpensesByGroup(groupId: string): Promise<Expense[]> {
    return this.expenses.filter((e) => e.groupId === groupId);
  }

  async addExpense(expense: Expense): Promise<Expense> {
    this.expenses.push(expense);
    return expense;
  }

  async getPaymentsByGroup(groupId: string): Promise<Payment[]> {
    return this.payments.filter((p) => p.groupId === groupId);
  }

  async recordPayment(payment: Payment): Promise<Payment> {
    this.payments.push(payment);
    return payment;
  }
}

export const storageService = new StorageService();
