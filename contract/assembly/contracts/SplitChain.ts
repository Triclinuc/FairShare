import {
  Context,
  generateEvent,
  Address,
  transferCoins,
  asyncCall,
  Slot,
  Storage,
} from '@massalabs/massa-as-sdk';
import { Args, stringToBytes } from '@massalabs/as-types';
import { u256 } from 'as-bignum/assembly/integer/u256';

import { Group } from '../structs/Group';
import { Expense } from '../structs/Expense';
import { Balance, Settlement } from '../structs/Balance';
import { GroupStatus, ExpenseCategory, expenseCategoryFromU8 } from '../helpers/enums';
import {
  MAX_MEMBERS_PER_GROUP,
  MAX_GROUP_NAME_LENGTH,
  MAX_DESCRIPTION_LENGTH,
  MAX_GAS_ASC_CALL,
} from '../helpers/constants';
import {
  getGroup,
  saveGroup,
  groupExists,
  generateGroupId,
  getExpense,
  saveExpense,
  deleteExpense as deleteExpenseFromStorage,
  expenseExists,
  generateExpenseId,
  getGroupExpenseIds,
  addToGroupExpenses,
  removeFromGroupExpenses,
  getUserGroupIds,
  addToUserGroups,
  removeFromUserGroups,
  addSettlement,
  getGroupSettlements,
  generateSettlementId,
} from '../storage/storage';

// Helper to convert u256 to u64 (simplified for small amounts)
function u256ToU64(value: u256): u64 {
  // For expense splitting, amounts should fit in u64
  return value.lo1; // Use the lowest 64 bits
}

// Helper to divide u256 by u64 - returns u64 for simplicity
function divideU256ByU64(amount: u256, divisor: u64): u64 {
  if (divisor == 0) return 0;
  // For expense splitting, convert to u64 first (amounts should be small enough)
  const amountU64 = u256ToU64(amount);
  return amountU64 / divisor;
}

// ==========================================
// CONSTRUCTOR
// ==========================================

export function constructor(_: StaticArray<u8>): void {
  assert(Context.isDeployingContract(), 'Already deployed');
  Storage.set(stringToBytes('PLATFORM'), stringToBytes(Context.caller().toString()));
  generateEvent('FairShare deployed by ' + Context.caller().toString());
}

// ==========================================
// GROUP MANAGEMENT
// ==========================================

/**
 * Create a new expense sharing group
 * @param _args - serialized: name (string), members (string[] as addresses), settlementDate (u64, 0 for manual)
 * @returns groupId
 */
export function createGroup(_args: StaticArray<u8>): StaticArray<u8> {
  const args = new Args(_args);
  const name = args.nextString().unwrap();
  const membersCount = args.nextU32().unwrap();

  const memberAddresses: Address[] = [];
  for (let i: u32 = 0; i < membersCount; i++) {
    memberAddresses.push(new Address(args.nextString().unwrap()));
  }

  const settlementDate = args.nextU64().unwrap();

  // Validations
  assert(name.length > 0 && name.length <= i32(MAX_GROUP_NAME_LENGTH), 'Invalid group name');
  assert(memberAddresses.length <= i32(MAX_MEMBERS_PER_GROUP), 'Too many members');

  const caller = Context.caller();
  const groupId = generateGroupId();

  // Add creator to members if not already included
  let creatorIncluded = false;
  for (let i = 0; i < memberAddresses.length; i++) {
    if (memberAddresses[i].toString() == caller.toString()) {
      creatorIncluded = true;
      break;
    }
  }
  if (!creatorIncluded) {
    memberAddresses.push(caller);
  }

  const group = new Group(
    groupId,
    name,
    caller,
    memberAddresses,
    Context.timestamp(),
    settlementDate,
    GroupStatus.Active,
    u256.Zero,
    0
  );

  saveGroup(group);

  // Add to user groups index for all members
  for (let i = 0; i < memberAddresses.length; i++) {
    addToUserGroups(memberAddresses[i].toString(), groupId);
  }

  // Schedule auto-settlement if date is set
  if (settlementDate > 0) {
    scheduleAutoSettlement(groupId, settlementDate);
  }

  generateEvent('GroupCreated:' + groupId.toString() + ':' + name + ':' + caller.toString());

  return new Args().add(groupId).serialize();
}

/**
 * Get group information
 */
export function getGroupInfo(_args: StaticArray<u8>): StaticArray<u8> {
  const args = new Args(_args);
  const groupId = args.nextU64().unwrap();

  assert(groupExists(groupId), 'Group not found');
  const group = getGroup(groupId);

  return group.serialize();
}

/**
 * Get all groups for a user
 */
export function getUserGroups(_args: StaticArray<u8>): StaticArray<u8> {
  const args = new Args(_args);
  const userAddress = args.nextString().unwrap();

  const groupIds = getUserGroupIds(userAddress);

  const result = new Args();
  result.add(u32(groupIds.length));
  for (let i = 0; i < groupIds.length; i++) {
    result.add(groupIds[i]);
  }

  return result.serialize();
}

/**
 * Add a member to a group (only creator can do this)
 */
export function addMember(_args: StaticArray<u8>): void {
  const args = new Args(_args);
  const groupId = args.nextU64().unwrap();
  const newMember = new Address(args.nextString().unwrap());

  assert(groupExists(groupId), 'Group not found');
  const group = getGroup(groupId);

  assert(Context.caller().toString() == group.creator.toString(), 'Only creator can add members');
  assert(group.status == GroupStatus.Active, 'Group is not active');
  assert(group.members.length < i32(MAX_MEMBERS_PER_GROUP), 'Group is full');

  group.addMember(newMember);
  saveGroup(group);
  addToUserGroups(newMember.toString(), groupId);

  generateEvent('MemberAdded:' + groupId.toString() + ':' + newMember.toString());
}

/**
 * Leave a group (member can leave if their balance is 0)
 */
export function leaveGroup(_args: StaticArray<u8>): void {
  const args = new Args(_args);
  const groupId = args.nextU64().unwrap();

  assert(groupExists(groupId), 'Group not found');
  const group = getGroup(groupId);
  const caller = Context.caller();

  assert(group.isMember(caller), 'Not a member');
  assert(group.status == GroupStatus.Active, 'Group is not active');

  // Check balance is 0
  const balance = calculateMemberBalance(groupId, caller.toString());
  assert(balance == 0, 'Settle your balance before leaving');

  group.removeMember(caller);
  saveGroup(group);
  removeFromUserGroups(caller.toString(), groupId);

  generateEvent('MemberLeft:' + groupId.toString() + ':' + caller.toString());
}

// ==========================================
// EXPENSE MANAGEMENT
// ==========================================

/**
 * Add an expense to a group
 * @param _args - groupId, description, amount (u256), category, splitBetween (addresses, empty = all members)
 */
export function addExpense(_args: StaticArray<u8>): StaticArray<u8> {
  const args = new Args(_args);
  const groupId = args.nextU64().unwrap();
  const description = args.nextString().unwrap();
  const amount = args.nextU256().unwrap();
  const category = expenseCategoryFromU8(args.nextU8().unwrap());

  const splitCount = args.nextU32().unwrap();
  const splitBetween: Address[] = [];
  for (let i: u32 = 0; i < splitCount; i++) {
    splitBetween.push(new Address(args.nextString().unwrap()));
  }

  // Validations
  assert(groupExists(groupId), 'Group not found');
  assert(description.length > 0 && description.length <= i32(MAX_DESCRIPTION_LENGTH), 'Invalid description');
  assert(u256.gt(amount, u256.Zero), 'Amount must be positive');

  const group = getGroup(groupId);
  const caller = Context.caller();

  assert(group.isMember(caller), 'Not a member of this group');
  assert(group.status == GroupStatus.Active, 'Group is not active');

  // If no split specified, split between all members
  let finalSplit = splitBetween;
  if (splitBetween.length == 0) {
    finalSplit = group.members;
  } else {
    // Validate all split members are in the group
    for (let i = 0; i < splitBetween.length; i++) {
      assert(group.isMember(splitBetween[i]), 'Split member not in group');
    }
  }

  const expenseId = generateExpenseId();
  const expense = new Expense(
    expenseId,
    groupId,
    description,
    amount,
    caller,
    finalSplit,
    Context.timestamp(),
    category
  );

  saveExpense(expense);
  addToGroupExpenses(groupId, expenseId);

  // Update group stats
  group.totalExpenses = u256.add(group.totalExpenses, amount);
  group.expenseCount++;
  saveGroup(group);

  generateEvent('ExpenseAdded:' + groupId.toString() + ':' + expenseId.toString() + ':' + amount.toString());

  return new Args().add(expenseId).serialize();
}

/**
 * Delete an expense (only the person who created it can delete)
 */
export function deleteExpenseById(_args: StaticArray<u8>): void {
  const args = new Args(_args);
  const expenseId = args.nextU64().unwrap();

  assert(expenseExists(expenseId), 'Expense not found');
  const expense = getExpense(expenseId);
  const caller = Context.caller();

  assert(expense.paidBy.toString() == caller.toString(), 'Only expense creator can delete');

  // Update group stats
  const group = getGroup(expense.groupId);
  group.totalExpenses = u256.sub(group.totalExpenses, expense.amount);
  group.expenseCount--;
  saveGroup(group);

  removeFromGroupExpenses(expense.groupId, expenseId);
  deleteExpenseFromStorage(expenseId);

  generateEvent('ExpenseDeleted:' + expense.groupId.toString() + ':' + expenseId.toString());
}

/**
 * Get all expenses for a group
 */
export function getGroupExpenses(_args: StaticArray<u8>): StaticArray<u8> {
  const args = new Args(_args);
  const groupId = args.nextU64().unwrap();

  const expenseIds = getGroupExpenseIds(groupId);

  const result = new Args();
  result.add(u32(expenseIds.length));

  for (let i = 0; i < expenseIds.length; i++) {
    if (expenseExists(expenseIds[i])) {
      const expense = getExpense(expenseIds[i]);
      result.add(expense.serialize());
    }
  }

  return result.serialize();
}

/**
 * Get a single expense
 */
export function getExpenseInfo(_args: StaticArray<u8>): StaticArray<u8> {
  const args = new Args(_args);
  const expenseId = args.nextU64().unwrap();

  assert(expenseExists(expenseId), 'Expense not found');
  const expense = getExpense(expenseId);

  return expense.serialize();
}

// ==========================================
// BALANCE CALCULATION
// ==========================================

/**
 * Calculate all balances for a group (who owes what to whom)
 */
export function calculateBalances(_args: StaticArray<u8>): StaticArray<u8> {
  const args = new Args(_args);
  const groupId = args.nextU64().unwrap();

  assert(groupExists(groupId), 'Group not found');
  const group = getGroup(groupId);
  const expenseIds = getGroupExpenseIds(groupId);
  const settlements = getGroupSettlements(groupId);

  // Build a map of balances: Map<from:to, amount>
  // Positive = from owes to, Negative = to owes from
  const balanceMap = new Map<string, i64>();

  // Process all expenses
  for (let i = 0; i < expenseIds.length; i++) {
    if (!expenseExists(expenseIds[i])) continue;

    const expense = getExpense(expenseIds[i]);
    const paidBy = expense.paidBy.toString();
    const splitCount = expense.splitBetween.length;

    if (splitCount == 0) continue;

    // Amount each person owes
    const amountPerPerson = divideU256ByU64(expense.amount, u64(splitCount));
    const amountI64 = i64(amountPerPerson);

    for (let j = 0; j < expense.splitBetween.length; j++) {
      const owes = expense.splitBetween[j].toString();

      // Skip if the person paid for themselves
      if (owes == paidBy) continue;

      // Key: owes:paidBy (person who owes : person who is owed)
      const key = owes + ':' + paidBy;
      const reverseKey = paidBy + ':' + owes;

      if (balanceMap.has(reverseKey)) {
        // Reduce the reverse debt
        const current = balanceMap.get(reverseKey);
        const newAmount = current - amountI64;
        if (newAmount > 0) {
          balanceMap.set(reverseKey, newAmount);
        } else if (newAmount < 0) {
          balanceMap.delete(reverseKey);
          balanceMap.set(key, -newAmount);
        } else {
          balanceMap.delete(reverseKey);
        }
      } else if (balanceMap.has(key)) {
        balanceMap.set(key, balanceMap.get(key) + amountI64);
      } else {
        balanceMap.set(key, amountI64);
      }
    }
  }

  // Process settlements (reduce debts)
  for (let i = 0; i < settlements.length; i++) {
    const s = settlements[i];
    const key = s.from.toString() + ':' + s.to.toString();
    const amountI64 = i64(u256ToU64(s.amount));

    if (balanceMap.has(key)) {
      const current = balanceMap.get(key);
      const newAmount = current - amountI64;
      if (newAmount > 0) {
        balanceMap.set(key, newAmount);
      } else {
        balanceMap.delete(key);
      }
    }
  }

  // Convert to Balance array
  const balances: Balance[] = [];
  const keys = balanceMap.keys();

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const amount = balanceMap.get(key);
    if (amount <= 0) continue;

    const parts = key.split(':');
    const from = new Address(parts[0]);
    const to = new Address(parts[1]);

    balances.push(new Balance(from, to, u256.fromU64(u64(amount))));
  }

  // Serialize result
  const result = new Args();
  result.add(u32(balances.length));
  for (let i = 0; i < balances.length; i++) {
    result.add(balances[i].serialize());
  }

  return result.serialize();
}

/**
 * Get the balance for a specific member (positive = they are owed, negative = they owe)
 */
export function getMemberBalance(_args: StaticArray<u8>): StaticArray<u8> {
  const args = new Args(_args);
  const groupId = args.nextU64().unwrap();
  const memberAddress = args.nextString().unwrap();

  const balance = calculateMemberBalance(groupId, memberAddress);

  return new Args().add(balance).serialize();
}

function calculateMemberBalance(groupId: u64, memberAddress: string): i64 {
  const expenseIds = getGroupExpenseIds(groupId);
  const settlements = getGroupSettlements(groupId);

  let balance: i64 = 0; // Positive = owed to member, Negative = member owes

  // Process expenses
  for (let i = 0; i < expenseIds.length; i++) {
    if (!expenseExists(expenseIds[i])) continue;

    const expense = getExpense(expenseIds[i]);
    const splitCount = expense.splitBetween.length;
    if (splitCount == 0) continue;

    const amountPerPerson = divideU256ByU64(expense.amount, u64(splitCount));
    const amountI64 = i64(amountPerPerson);

    // If member paid, they are owed by others
    if (expense.paidBy.toString() == memberAddress) {
      for (let j = 0; j < expense.splitBetween.length; j++) {
        if (expense.splitBetween[j].toString() != memberAddress) {
          balance += amountI64;
        }
      }
    }

    // If member is in split, they owe the payer
    if (expense.isInSplit(new Address(memberAddress)) && expense.paidBy.toString() != memberAddress) {
      balance -= amountI64;
    }
  }

  // Process settlements
  for (let i = 0; i < settlements.length; i++) {
    const s = settlements[i];
    // If member paid in settlement, reduce what they owe
    if (s.from.toString() == memberAddress) {
      balance += i64(u256ToU64(s.amount));
    }
    // If member received in settlement, reduce what's owed to them
    if (s.to.toString() == memberAddress) {
      balance -= i64(u256ToU64(s.amount));
    }
  }

  return balance;
}

// ==========================================
// SETTLEMENT
// ==========================================

/**
 * Settle debt by sending payment
 * Caller sends coins with the transaction to pay their debt
 */
export function settleDebt(_args: StaticArray<u8>): void {
  const args = new Args(_args);
  const groupId = args.nextU64().unwrap();
  const toAddress = new Address(args.nextString().unwrap());

  assert(groupExists(groupId), 'Group not found');
  const group = getGroup(groupId);
  const caller = Context.caller();

  assert(group.isMember(caller), 'Not a member');
  assert(group.isMember(toAddress), 'Recipient not a member');
  assert(group.status == GroupStatus.Active, 'Group is not active');

  const amount = Context.transferredCoins();
  assert(amount > 0, 'No coins transferred');

  // Transfer to recipient
  transferCoins(toAddress, amount);

  // Record settlement
  const settlement = new Settlement(
    generateSettlementId(),
    groupId,
    caller,
    toAddress,
    u256.fromU64(amount),
    Context.timestamp()
  );
  addSettlement(settlement);

  generateEvent('DebtSettled:' + groupId.toString() + ':' + caller.toString() + ':' + toAddress.toString() + ':' + amount.toString());
}

/**
 * Schedule auto-settlement (internal function)
 */
function scheduleAutoSettlement(groupId: u64, settlementDate: u64): void {
  const currentTime = Context.timestamp();
  if (settlementDate <= currentTime) return;

  // Convert timestamp to period (approximate - 16 seconds per period)
  const msPerPeriod: u64 = 16000; // 16 seconds
  const currentPeriod = Context.currentPeriod();
  const periodDiff = (settlementDate - currentTime) / msPerPeriod;
  const targetPeriod = currentPeriod + periodDiff;

  // Schedule deferred call to autoSettle using asyncCall
  const startSlot = new Slot(targetPeriod, 0);
  const endSlot = new Slot(targetPeriod + 10, 31); // 10 periods window

  asyncCall(
    Context.callee(),
    'autoSettle',
    startSlot,
    endSlot,
    MAX_GAS_ASC_CALL,
    100_000_000, // 0.1 MAS fee
    new Args().add(groupId).serialize(),
    0 // no coins
  );

  generateEvent('SettlementScheduled:' + groupId.toString() + ':' + settlementDate.toString());
}

/**
 * Auto-settle (called by ASC at scheduled time)
 */
export function autoSettle(_args: StaticArray<u8>): void {
  const args = new Args(_args);
  const groupId = args.nextU64().unwrap();

  assert(groupExists(groupId), 'Group not found');
  const group = getGroup(groupId);

  // Only execute if group is active
  if (group.status != GroupStatus.Active) return;

  // Calculate final balances
  const balancesData = calculateBalances(new Args().add(groupId).serialize());
  const balancesArgs = new Args(balancesData);
  const balanceCount = balancesArgs.nextU32().unwrap();

  // Emit events for all outstanding balances
  for (let i: u32 = 0; i < balanceCount; i++) {
    const balanceData = balancesArgs.nextBytes().unwrap();
    const balance = new Balance();
    balance.deserialize(balanceData, 0);

    generateEvent('AutoSettlement:' + groupId.toString() + ':' + balance.from.toString() + ':' + balance.to.toString() + ':' + balance.amount.toString());
  }

  // Mark group as settled
  group.status = GroupStatus.Settled;
  saveGroup(group);

  generateEvent('GroupSettled:' + groupId.toString());
}

/**
 * Manually trigger settlement (close the group)
 */
export function closeGroup(_args: StaticArray<u8>): void {
  const args = new Args(_args);
  const groupId = args.nextU64().unwrap();

  assert(groupExists(groupId), 'Group not found');
  const group = getGroup(groupId);
  const caller = Context.caller();

  assert(caller.toString() == group.creator.toString(), 'Only creator can close group');
  assert(group.status == GroupStatus.Active, 'Group is not active');

  // Run auto-settle logic
  autoSettle(new Args().add(groupId).serialize());
}

// ==========================================
// QUERY FUNCTIONS
// ==========================================

/**
 * Get settlements for a group
 */
export function getSettlements(_args: StaticArray<u8>): StaticArray<u8> {
  const args = new Args(_args);
  const groupId = args.nextU64().unwrap();

  const settlements = getGroupSettlements(groupId);

  const result = new Args();
  result.add(u32(settlements.length));
  for (let i = 0; i < settlements.length; i++) {
    result.add(settlements[i].serialize());
  }

  return result.serialize();
}

/**
 * Check if user is member of a group
 */
export function isMember(_args: StaticArray<u8>): StaticArray<u8> {
  const args = new Args(_args);
  const groupId = args.nextU64().unwrap();
  const userAddress = args.nextString().unwrap();

  if (!groupExists(groupId)) {
    return new Args().add(false).serialize();
  }

  const group = getGroup(groupId);
  return new Args().add(group.isMember(new Address(userAddress))).serialize();
}
