// Expense categories
export enum ExpenseCategory {
  Food = 0,
  Transport = 1,
  Accommodation = 2,
  Activities = 3,
  Shopping = 4,
  Other = 5
}

// Group status
export enum GroupStatus {
  Active = 0,
  Settled = 1,
  Cancelled = 2
}

// Group structure
export interface Group {
  groupId: number;
  name: string;
  creator: string;
  members: string[];
  createdAt: number;
  settlementDate: number;
  status: GroupStatus;
  totalExpenses: string;
  expenseCount: number;
}

// Expense structure
export interface Expense {
  expenseId: number;
  groupId: number;
  description: string;
  amount: string;
  paidBy: string;
  splitBetween: string[];
  createdAt: number;
  category: ExpenseCategory;
}

// Balance structure
export interface Balance {
  from: string;
  to: string;
  amount: string;
}

// Settlement structure
export interface Settlement {
  settlementId: number;
  groupId: number;
  from: string;
  to: string;
  amount: string;
  settledAt: number;
}

// Category labels
export const categoryLabels: Record<ExpenseCategory, string> = {
  [ExpenseCategory.Food]: 'Food & Drinks',
  [ExpenseCategory.Transport]: 'Transport',
  [ExpenseCategory.Accommodation]: 'Accommodation',
  [ExpenseCategory.Activities]: 'Activities',
  [ExpenseCategory.Shopping]: 'Shopping',
  [ExpenseCategory.Other]: 'Other'
};

// Status labels
export const statusLabels: Record<GroupStatus, string> = {
  [GroupStatus.Active]: 'Active',
  [GroupStatus.Settled]: 'Settled',
  [GroupStatus.Cancelled]: 'Cancelled'
};

// Activity item (unified type for expenses and settlements)
export type ActivityItem =
  | { type: 'expense'; data: Expense; date: number }
  | { type: 'settlement'; data: Settlement; date: number };
