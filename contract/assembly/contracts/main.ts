// FairShare - Decentralized Expense Sharing on Massa
// Main entry point - exports all public functions

export {
  // Constructor
  constructor,

  // Group Management
  createGroup,
  getGroupInfo,
  getUserGroups,
  addMember,
  leaveGroup,
  closeGroup,

  // Expense Management
  addExpense,
  deleteExpenseById,
  getGroupExpenses,
  getExpenseInfo,

  // Balance & Settlement
  calculateBalances,
  getMemberBalance,
  settleDebt,
  autoSettle,
  getSettlements,

  // Queries
  isMember,
} from './SplitChain';
