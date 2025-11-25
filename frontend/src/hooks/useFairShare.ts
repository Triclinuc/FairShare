import { useCallback } from "react";
import { useWallet } from "../contexts/WalletContext";
import { useTransactionToast } from "./useTransactionToast";
import { CONTRACT_ADDRESS, CONTRACT_FUNCTIONS, toNanoMAS } from "../config/contract";
import { Args, OperationStatus } from "@massalabs/massa-web3";
import type { Group, Expense, Balance, Settlement, ExpenseCategory } from "../types/contract";
import { pollAsyncEvents, extractErrorMessage } from "../utils/eventPoller";
import { getReadOnlyProvider } from "../utils/readOnlyProvider";

// ==========================================
// PARSING HELPERS
// ==========================================

/**
 * Parse a Group from Args
 */
function parseGroup(data: Uint8Array): Group | null {
  try {
    const args = new Args(data);

    const groupId = Number(args.nextU64());
    const name = args.nextString();
    const creator = args.nextString();

    const membersLength = Number(args.nextU32());
    const members: string[] = [];
    if (membersLength > 0) {
      const membersData = args.nextUint8Array();
      const membersArgs = new Args(membersData);
      for (let i = 0; i < membersLength; i++) {
        members.push(membersArgs.nextString());
      }
    }

    const createdAt = Number(args.nextU64());
    const settlementDate = Number(args.nextU64());
    const status = Number(args.nextU8());
    const totalExpenses = args.nextU256().toString();
    const expenseCount = Number(args.nextU32());

    return {
      groupId,
      name,
      creator,
      members,
      createdAt,
      settlementDate,
      status,
      totalExpenses,
      expenseCount,
    };
  } catch (error) {
    console.error("Error parsing group:", error);
    return null;
  }
}

/**
 * Parse an Expense from Args
 */
function parseExpense(data: Uint8Array): Expense | null {
  try {
    const args = new Args(data);

    const expenseId = Number(args.nextU64());
    const groupId = Number(args.nextU64());
    const description = args.nextString();
    const amount = args.nextU256().toString();
    const paidBy = args.nextString();

    const splitLength = Number(args.nextU32());
    const splitBetween: string[] = [];
    if (splitLength > 0) {
      const splitData = args.nextUint8Array();
      const splitArgs = new Args(splitData);
      for (let i = 0; i < splitLength; i++) {
        splitBetween.push(splitArgs.nextString());
      }
    }

    const createdAt = Number(args.nextU64());
    const category = Number(args.nextU8()) as ExpenseCategory;

    return {
      expenseId,
      groupId,
      description,
      amount,
      paidBy,
      splitBetween,
      createdAt,
      category,
    };
  } catch (error) {
    console.error("Error parsing expense:", error);
    return null;
  }
}

/**
 * Parse a Balance from Args
 */
function parseBalance(data: Uint8Array): Balance | null {
  try {
    const args = new Args(data);

    const from = args.nextString();
    const to = args.nextString();
    const amount = args.nextU256().toString();

    return { from, to, amount };
  } catch (error) {
    console.error("Error parsing balance:", error);
    return null;
  }
}

/**
 * Parse a Settlement from Args
 */
function parseSettlement(data: Uint8Array): Settlement | null {
  try {
    const args = new Args(data);

    const settlementId = Number(args.nextU64());
    const groupId = Number(args.nextU64());
    const from = args.nextString();
    const to = args.nextString();
    const amount = args.nextU256().toString();
    const settledAt = Number(args.nextU64());

    return { settlementId, groupId, from, to, amount, settledAt };
  } catch (error) {
    console.error("Error parsing settlement:", error);
    return null;
  }
}

/**
 * Hook for interacting with FairShare smart contract
 */
export const useFairShare = () => {
  const { account } = useWallet();
  const toast = useTransactionToast();

  // ==========================================
  // READ FUNCTIONS
  // ==========================================

  /**
   * Get group information
   */
  const getGroupInfo = useCallback(async (groupId: number): Promise<Group | null> => {
    try {
      const provider = await getReadOnlyProvider();
      const args = new Args().addU64(BigInt(groupId));

      const result = await provider.readSC({
        target: CONTRACT_ADDRESS,
        func: CONTRACT_FUNCTIONS.getGroupInfo,
        parameter: args.serialize(),
      });

      if (result && result.value && result.value.length > 0) {
        return parseGroup(result.value as Uint8Array);
      }
      return null;
    } catch (error) {
      console.error("Error getting group info:", error);
      return null;
    }
  }, []);

  /**
   * Get all groups for a user
   */
  const getUserGroups = useCallback(async (userAddress: string): Promise<number[]> => {
    try {
      const provider = await getReadOnlyProvider();
      const args = new Args().addString(userAddress);

      const result = await provider.readSC({
        target: CONTRACT_ADDRESS,
        func: CONTRACT_FUNCTIONS.getUserGroups,
        parameter: args.serialize(),
      });

      if (!result || !result.value) return [];

      const argsParser = new Args(result.value as Uint8Array);
      const count = Number(argsParser.nextU32());

      const groupIds: number[] = [];
      for (let i = 0; i < count; i++) {
        groupIds.push(Number(argsParser.nextU64()));
      }

      return groupIds;
    } catch (error) {
      console.error("Error getting user groups:", error);
      return [];
    }
  }, []);

  /**
   * Get all expenses for a group
   */
  const getGroupExpenses = useCallback(async (groupId: number): Promise<Expense[]> => {
    try {
      const provider = await getReadOnlyProvider();
      const args = new Args().addU64(BigInt(groupId));

      const result = await provider.readSC({
        target: CONTRACT_ADDRESS,
        func: CONTRACT_FUNCTIONS.getGroupExpenses,
        parameter: args.serialize(),
      });

      if (!result || !result.value) return [];

      const argsParser = new Args(result.value as Uint8Array);
      const count = Number(argsParser.nextU32());

      const expenses: Expense[] = [];
      for (let i = 0; i < count; i++) {
        const expenseData = argsParser.nextUint8Array();
        const expense = parseExpense(expenseData);
        if (expense) {
          expenses.push(expense);
        }
      }

      return expenses;
    } catch (error) {
      console.error("Error getting group expenses:", error);
      return [];
    }
  }, []);

  /**
   * Calculate balances for a group
   */
  const calculateBalances = useCallback(async (groupId: number): Promise<Balance[]> => {
    try {
      const provider = await getReadOnlyProvider();
      const args = new Args().addU64(BigInt(groupId));

      const result = await provider.readSC({
        target: CONTRACT_ADDRESS,
        func: CONTRACT_FUNCTIONS.calculateBalances,
        parameter: args.serialize(),
      });

      if (!result || !result.value) return [];

      const argsParser = new Args(result.value as Uint8Array);
      const count = Number(argsParser.nextU32());

      const balances: Balance[] = [];
      for (let i = 0; i < count; i++) {
        const balanceData = argsParser.nextUint8Array();
        const balance = parseBalance(balanceData);
        if (balance) {
          balances.push(balance);
        }
      }

      return balances;
    } catch (error) {
      console.error("Error calculating balances:", error);
      return [];
    }
  }, []);

  /**
   * Get member balance (positive = owed to member, negative = member owes)
   */
  const getMemberBalance = useCallback(async (groupId: number, memberAddress: string): Promise<number> => {
    try {
      const provider = await getReadOnlyProvider();
      const args = new Args()
        .addU64(BigInt(groupId))
        .addString(memberAddress);

      const result = await provider.readSC({
        target: CONTRACT_ADDRESS,
        func: CONTRACT_FUNCTIONS.getMemberBalance,
        parameter: args.serialize(),
      });

      if (!result || !result.value) return 0;

      const argsParser = new Args(result.value as Uint8Array);
      // i64 is returned as balance
      const balance = argsParser.nextI64();
      return Number(balance);
    } catch (error) {
      console.error("Error getting member balance:", error);
      return 0;
    }
  }, []);

  /**
   * Get settlements for a group
   */
  const getSettlements = useCallback(async (groupId: number): Promise<Settlement[]> => {
    try {
      const provider = await getReadOnlyProvider();
      const args = new Args().addU64(BigInt(groupId));

      const result = await provider.readSC({
        target: CONTRACT_ADDRESS,
        func: CONTRACT_FUNCTIONS.getSettlements,
        parameter: args.serialize(),
      });

      if (!result || !result.value) return [];

      const argsParser = new Args(result.value as Uint8Array);
      const count = Number(argsParser.nextU32());

      const settlements: Settlement[] = [];
      for (let i = 0; i < count; i++) {
        const settlementData = argsParser.nextUint8Array();
        const settlement = parseSettlement(settlementData);
        if (settlement) {
          settlements.push(settlement);
        }
      }

      return settlements;
    } catch (error) {
      console.error("Error getting settlements:", error);
      return [];
    }
  }, []);

  /**
   * Check if user is member of a group
   */
  const isMember = useCallback(async (groupId: number, userAddress: string): Promise<boolean> => {
    try {
      const provider = await getReadOnlyProvider();
      const args = new Args()
        .addU64(BigInt(groupId))
        .addString(userAddress);

      const result = await provider.readSC({
        target: CONTRACT_ADDRESS,
        func: CONTRACT_FUNCTIONS.isMember,
        parameter: args.serialize(),
      });

      if (!result || !result.value) return false;

      const argsParser = new Args(result.value as Uint8Array);
      return argsParser.nextBool();
    } catch (error) {
      console.error("Error checking membership:", error);
      return false;
    }
  }, []);

  // ==========================================
  // WRITE FUNCTIONS
  // ==========================================

  /**
   * Create a new group
   */
  const createGroup = useCallback(
    async (data: {
      name: string;
      members: string[];
      settlementDate?: number;
    }) => {
      if (!account) {
        throw new Error("Wallet not connected");
      }

      const toastId = toast.showPending("Preparing group creation...");

      try {
        const args = new Args()
          .addString(data.name)
          .addU32(BigInt(data.members.length));

        // Add each member address
        for (const member of data.members) {
          args.addString(member);
        }

        // Add settlement date (0 for manual settlement)
        args.addU64(BigInt(data.settlementDate || 0));

        const operation = await account.callSC({
          target: CONTRACT_ADDRESS,
          func: CONTRACT_FUNCTIONS.createGroup,
          parameter: args.serialize(),
          coins: 0n,
          fee: 100_000_000n,
          maxGas: 1_000_000_000n,
        });

        console.log("Create group transaction submitted:", operation.id);

        toast.updatePending(
          "Blockchain transaction sent!",
          "Confirming on blockchain...",
          toastId
        );

        const [finalStatus, eventResult] = await Promise.all([
          operation.waitSpeculativeExecution(),
          pollAsyncEvents(account, operation.id),
        ]);

        if (eventResult.isError) {
          const errorMessage = extractErrorMessage(eventResult.events) || "Group creation failed";
          throw new Error(errorMessage);
        }

        if (
          finalStatus === OperationStatus.SpeculativeError ||
          finalStatus === OperationStatus.Error ||
          finalStatus === OperationStatus.NotFound
        ) {
          throw new Error("Group creation failed on blockchain");
        }

        // Extract groupId from events
        const groupCreatedEvent = eventResult.events.find((e) =>
          e.data.startsWith("GroupCreated:")
        );
        let groupId: number | null = null;
        if (groupCreatedEvent) {
          const parts = groupCreatedEvent.data.split(":");
          groupId = parseInt(parts[1], 10);
        }

        toast.showSuccess(
          "Group successfully established!",
          "Your group is now active",
          toastId
        );

        return {
          success: true,
          operationId: operation.id,
          groupId,
          events: eventResult.events,
        };
      } catch (error) {
        console.error("Error creating group:", error);
        toast.showError("Unable to create group", error, toastId);
        throw error;
      }
    },
    [account, toast]
  );

  /**
   * Add an expense to a group
   */
  const addExpense = useCallback(
    async (data: {
      groupId: number;
      description: string;
      amount: number; // Amount in MAS
      category: ExpenseCategory;
      splitBetween?: string[]; // Empty = split between all members
    }) => {
      if (!account) {
        throw new Error("Wallet not connected");
      }

      const toastId = toast.showPending("Submitting expense...");

      try {
        const amountInNanoMAS = toNanoMAS(data.amount);
        const splitMembers = data.splitBetween || [];

        const args = new Args()
          .addU64(BigInt(data.groupId))
          .addString(data.description)
          .addU256(amountInNanoMAS)
          .addU8(BigInt(data.category))
          .addU32(BigInt(splitMembers.length));

        // Add each split member address
        for (const member of splitMembers) {
          args.addString(member);
        }

        const operation = await account.callSC({
          target: CONTRACT_ADDRESS,
          func: CONTRACT_FUNCTIONS.addExpense,
          parameter: args.serialize(),
          coins: 0n,
          fee: 100_000_000n,
          maxGas: 1_000_000_000n,
        });

        console.log("Add expense transaction submitted:", operation.id);

        toast.updatePending(
          "Blockchain transaction sent!",
          "Confirming on blockchain...",
          toastId
        );

        const [finalStatus, eventResult] = await Promise.all([
          operation.waitSpeculativeExecution(),
          pollAsyncEvents(account, operation.id),
        ]);

        if (eventResult.isError) {
          const errorMessage = extractErrorMessage(eventResult.events) || "Add expense failed";
          throw new Error(errorMessage);
        }

        if (
          finalStatus === OperationStatus.SpeculativeError ||
          finalStatus === OperationStatus.Error ||
          finalStatus === OperationStatus.NotFound
        ) {
          throw new Error("Add expense failed on blockchain");
        }

        toast.showSuccess(
          "Expense recorded successfully!",
          "Expense tracking updated",
          toastId
        );

        return {
          success: true,
          operationId: operation.id,
          events: eventResult.events,
        };
      } catch (error) {
        console.error("Error adding expense:", error);
        toast.showError("Could not add expense", error, toastId);
        throw error;
      }
    },
    [account, toast]
  );

  /**
   * Delete an expense
   */
  const deleteExpense = useCallback(
    async (expenseId: number) => {
      if (!account) {
        throw new Error("Wallet not connected");
      }

      const toastId = toast.showPending("Removing expense...");

      try {
        const args = new Args().addU64(BigInt(expenseId));

        const operation = await account.callSC({
          target: CONTRACT_ADDRESS,
          func: CONTRACT_FUNCTIONS.deleteExpenseById,
          parameter: args.serialize(),
          coins: 0n,
          fee: 100_000_000n,
          maxGas: 1_000_000_000n,
        });

        toast.updatePending(
          "Blockchain transaction sent!",
          "Confirming on blockchain...",
          toastId
        );

        const [finalStatus, eventResult] = await Promise.all([
          operation.waitSpeculativeExecution(),
          pollAsyncEvents(account, operation.id),
        ]);

        if (eventResult.isError) {
          const errorMessage = extractErrorMessage(eventResult.events) || "Delete expense failed";
          throw new Error(errorMessage);
        }

        if (
          finalStatus === OperationStatus.SpeculativeError ||
          finalStatus === OperationStatus.Error ||
          finalStatus === OperationStatus.NotFound
        ) {
          throw new Error("Delete expense failed on blockchain");
        }

        toast.showSuccess("Expense removed successfully!", undefined, toastId);

        return { success: true, operationId: operation.id };
      } catch (error) {
        console.error("Error deleting expense:", error);
        toast.showError("Could not remove expense", error, toastId);
        throw error;
      }
    },
    [account, toast]
  );

  /**
   * Settle debt by sending payment
   */
  const settleDebt = useCallback(
    async (groupId: number, toAddress: string, amount: number) => {
      if (!account) {
        throw new Error("Wallet not connected");
      }

      const toastId = toast.showPending("Processing payment...");

      try {
        const amountInNanoMAS = toNanoMAS(amount);
        const args = new Args()
          .addU64(BigInt(groupId))
          .addString(toAddress);

        const operation = await account.callSC({
          target: CONTRACT_ADDRESS,
          func: CONTRACT_FUNCTIONS.settleDebt,
          parameter: args.serialize(),
          coins: amountInNanoMAS,
          fee: 100_000_000n,
          maxGas: 1_000_000_000n,
        });

        toast.updatePending(
          "Blockchain transaction sent!",
          "Confirming on blockchain...",
          toastId
        );

        const [finalStatus, eventResult] = await Promise.all([
          operation.waitSpeculativeExecution(),
          pollAsyncEvents(account, operation.id),
        ]);

        if (eventResult.isError) {
          const errorMessage = extractErrorMessage(eventResult.events) || "Settlement failed";
          throw new Error(errorMessage);
        }

        if (
          finalStatus === OperationStatus.SpeculativeError ||
          finalStatus === OperationStatus.Error ||
          finalStatus === OperationStatus.NotFound
        ) {
          throw new Error("Settlement failed on blockchain");
        }

        toast.showSuccess(
          "Payment completed successfully!",
          "Transaction verified on chain",
          toastId
        );

        return { success: true, operationId: operation.id };
      } catch (error) {
        console.error("Error settling debt:", error);
        toast.showError("Payment could not be processed", error, toastId);
        throw error;
      }
    },
    [account, toast]
  );

  /**
   * Add a member to a group (only creator)
   */
  const addMember = useCallback(
    async (groupId: number, memberAddress: string) => {
      if (!account) {
        throw new Error("Wallet not connected");
      }

      const toastId = toast.showPending("Including new member...");

      try {
        const args = new Args()
          .addU64(BigInt(groupId))
          .addString(memberAddress);

        const operation = await account.callSC({
          target: CONTRACT_ADDRESS,
          func: CONTRACT_FUNCTIONS.addMember,
          parameter: args.serialize(),
          coins: 0n,
          fee: 100_000_000n,
          maxGas: 1_000_000_000n,
        });

        toast.updatePending(
          "Blockchain transaction sent!",
          "Confirming on blockchain...",
          toastId
        );

        const [finalStatus, eventResult] = await Promise.all([
          operation.waitSpeculativeExecution(),
          pollAsyncEvents(account, operation.id),
        ]);

        if (eventResult.isError) {
          const errorMessage = extractErrorMessage(eventResult.events) || "Add member failed";
          throw new Error(errorMessage);
        }

        if (
          finalStatus === OperationStatus.SpeculativeError ||
          finalStatus === OperationStatus.Error ||
          finalStatus === OperationStatus.NotFound
        ) {
          throw new Error("Add member failed on blockchain");
        }

        toast.showSuccess("Member joined the group!", undefined, toastId);

        return { success: true, operationId: operation.id };
      } catch (error) {
        console.error("Error adding member:", error);
        toast.showError("Unable to add member", error, toastId);
        throw error;
      }
    },
    [account, toast]
  );

  /**
   * Leave a group (balance must be 0)
   */
  const leaveGroup = useCallback(
    async (groupId: number) => {
      if (!account) {
        throw new Error("Wallet not connected");
      }

      const toastId = toast.showPending("Exiting group...");

      try {
        const args = new Args().addU64(BigInt(groupId));

        const operation = await account.callSC({
          target: CONTRACT_ADDRESS,
          func: CONTRACT_FUNCTIONS.leaveGroup,
          parameter: args.serialize(),
          coins: 0n,
          fee: 100_000_000n,
          maxGas: 1_000_000_000n,
        });

        toast.updatePending(
          "Blockchain transaction sent!",
          "Confirming on blockchain...",
          toastId
        );

        const [finalStatus, eventResult] = await Promise.all([
          operation.waitSpeculativeExecution(),
          pollAsyncEvents(account, operation.id),
        ]);

        if (eventResult.isError) {
          const errorMessage = extractErrorMessage(eventResult.events) || "Leave group failed";
          throw new Error(errorMessage);
        }

        if (
          finalStatus === OperationStatus.SpeculativeError ||
          finalStatus === OperationStatus.Error ||
          finalStatus === OperationStatus.NotFound
        ) {
          throw new Error("Leave group failed on blockchain");
        }

        toast.showSuccess("You have exited the group!", undefined, toastId);

        return { success: true, operationId: operation.id };
      } catch (error) {
        console.error("Error leaving group:", error);
        toast.showError("Could not exit group", error, toastId);
        throw error;
      }
    },
    [account, toast]
  );

  /**
   * Close group and trigger settlement (only creator)
   */
  const closeGroup = useCallback(
    async (groupId: number) => {
      if (!account) {
        throw new Error("Wallet not connected");
      }

      const toastId = toast.showPending("Finalizing group...");

      try {
        const args = new Args().addU64(BigInt(groupId));

        const operation = await account.callSC({
          target: CONTRACT_ADDRESS,
          func: CONTRACT_FUNCTIONS.closeGroup,
          parameter: args.serialize(),
          coins: 0n,
          fee: 100_000_000n,
          maxGas: 2_000_000_000n,
        });

        toast.updatePending(
          "Blockchain transaction sent!",
          "Confirming on blockchain...",
          toastId
        );

        const [finalStatus, eventResult] = await Promise.all([
          operation.waitSpeculativeExecution(),
          pollAsyncEvents(account, operation.id),
        ]);

        if (eventResult.isError) {
          const errorMessage = extractErrorMessage(eventResult.events) || "Close group failed";
          throw new Error(errorMessage);
        }

        if (
          finalStatus === OperationStatus.SpeculativeError ||
          finalStatus === OperationStatus.Error ||
          finalStatus === OperationStatus.NotFound
        ) {
          throw new Error("Close group failed on blockchain");
        }

        toast.showSuccess(
          "Group has been finalized!",
          "Settlement balances computed",
          toastId
        );

        return { success: true, operationId: operation.id };
      } catch (error) {
        console.error("Error closing group:", error);
        toast.showError("Unable to finalize group", error, toastId);
        throw error;
      }
    },
    [account, toast]
  );

  return {
    // Read functions
    getGroupInfo,
    getUserGroups,
    getGroupExpenses,
    calculateBalances,
    getMemberBalance,
    getSettlements,
    isMember,

    // Write functions
    createGroup,
    addExpense,
    deleteExpense,
    settleDebt,
    addMember,
    leaveGroup,
    closeGroup,
  };
};
