// FairShare Contract Configuration

// Contract address - UPDATE THIS AFTER DEPLOYMENT
export const CONTRACT_ADDRESS =
  "AS1th544os5w2Bp6NkmNQg1TqzGjSwZ7HLHSa9QSyHMyJkXTjFXe";

// Network configuration
export const NETWORK = {
  buildnet: {
    name: "BuildNet",
    rpcUrl: "https://buildnet.massa.net/api/v2",
    chainId: 77658366n,
  },
  mainnet: {
    name: "MainNet",
    rpcUrl: "https://mainnet.massa.net/api/v2",
    chainId: 77658377n,
  },
};

// Current network
export const CURRENT_NETWORK = NETWORK.buildnet;

// Contract function names
export const CONTRACT_FUNCTIONS = {
  // Group management
  createGroup: "createGroup",
  getGroupInfo: "getGroupInfo",
  getUserGroups: "getUserGroups",
  addMember: "addMember",
  leaveGroup: "leaveGroup",
  closeGroup: "closeGroup",

  // Expense management
  addExpense: "addExpense",
  deleteExpenseById: "deleteExpenseById",
  getGroupExpenses: "getGroupExpenses",
  getExpenseInfo: "getExpenseInfo",

  // Balance & Settlement
  calculateBalances: "calculateBalances",
  getMemberBalance: "getMemberBalance",
  settleDebt: "settleDebt",
  getSettlements: "getSettlements",

  // Queries
  isMember: "isMember",
};

// Gas limits
export const GAS_LIMITS = {
  read: 1_000_000_000n,
  write: 2_000_000_000n,
};

// Helper to format MAS amounts
export function formatMAS(nanoMAS: string | bigint): string {
  const value = typeof nanoMAS === "string" ? BigInt(nanoMAS) : nanoMAS;
  const mas = Number(value) / 1_000_000_000;
  return mas.toFixed(2);
}

// Helper to convert MAS to nanoMAS
export function toNanoMAS(mas: number): bigint {
  return BigInt(Math.floor(mas * 1_000_000_000));
}
