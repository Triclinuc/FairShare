// Expense categories
export enum ExpenseCategory {
  Food = 0,           // Nourriture/Resto
  Transport = 1,      // Transport
  Accommodation = 2,  // Logement
  Activities = 3,     // Activities
  Shopping = 4,       // Courses
  Other = 5           // Autre
}

// Group status
export enum GroupStatus {
  Active = 0,
  Settled = 1,
  Cancelled = 2
}

// Helper functions for enum conversion
export function expenseCategoryFromU8(value: u8): ExpenseCategory {
  if (value > 5) return ExpenseCategory.Other;
  return value as ExpenseCategory;
}

export function groupStatusFromU8(value: u8): GroupStatus {
  if (value > 2) return GroupStatus.Active;
  return value as GroupStatus;
}

export function expenseCategoryToString(category: ExpenseCategory): string {
  switch (category) {
    case ExpenseCategory.Food: return "Food";
    case ExpenseCategory.Transport: return "Transport";
    case ExpenseCategory.Accommodation: return "Accommodation";
    case ExpenseCategory.Activities: return "Activities";
    case ExpenseCategory.Shopping: return "Shopping";
    default: return "Other";
  }
}

export function groupStatusToString(status: GroupStatus): string {
  switch (status) {
    case GroupStatus.Active: return "Active";
    case GroupStatus.Settled: return "Settled";
    case GroupStatus.Cancelled: return "Cancelled";
    default: return "Unknown";
  }
}
