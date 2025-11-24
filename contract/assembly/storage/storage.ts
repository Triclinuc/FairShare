import { Storage } from '@massalabs/massa-as-sdk';
import { Args, bytesToU64, u64ToBytes, stringToBytes } from '@massalabs/as-types';
import { Group } from '../structs/Group';
import { Expense } from '../structs/Expense';
import { Settlement } from '../structs/Balance';
import {
  GROUP_PREFIX,
  EXPENSE_PREFIX,
  GROUP_EXPENSES_PREFIX,
  USER_GROUPS_PREFIX,
  SETTLEMENT_PREFIX,
  GROUP_COUNTER_KEY,
  EXPENSE_COUNTER_KEY,
} from '../helpers/constants';

// ==========================================
// GROUP STORAGE
// ==========================================

export function buildGroupKey(groupId: u64): string {
  return GROUP_PREFIX + groupId.toString();
}

export function getGroup(groupId: u64): Group {
  const key = buildGroupKey(groupId);
  assert(Storage.has(stringToBytes(key)), 'Group not found');
  const data = Storage.get(stringToBytes(key));
  const group = new Group();
  group.deserialize(data, 0);
  return group;
}

export function groupExists(groupId: u64): bool {
  const key = buildGroupKey(groupId);
  return Storage.has(stringToBytes(key));
}

export function saveGroup(group: Group): void {
  const key = buildGroupKey(group.groupId);
  Storage.set(stringToBytes(key), group.serialize());
}

export function deleteGroup(groupId: u64): void {
  const key = buildGroupKey(groupId);
  Storage.del(stringToBytes(key));
}

export function generateGroupId(): u64 {
  let counter: u64 = 0;
  const keyBytes = stringToBytes(GROUP_COUNTER_KEY);
  if (Storage.has(keyBytes)) {
    counter = bytesToU64(Storage.get(keyBytes));
  }
  counter++;
  Storage.set(keyBytes, u64ToBytes(counter));
  return counter;
}

// ==========================================
// EXPENSE STORAGE
// ==========================================

export function buildExpenseKey(expenseId: u64): string {
  return EXPENSE_PREFIX + expenseId.toString();
}

export function getExpense(expenseId: u64): Expense {
  const key = buildExpenseKey(expenseId);
  assert(Storage.has(stringToBytes(key)), 'Expense not found');
  const data = Storage.get(stringToBytes(key));
  const expense = new Expense();
  expense.deserialize(data, 0);
  return expense;
}

export function expenseExists(expenseId: u64): bool {
  const key = buildExpenseKey(expenseId);
  return Storage.has(stringToBytes(key));
}

export function saveExpense(expense: Expense): void {
  const key = buildExpenseKey(expense.expenseId);
  Storage.set(stringToBytes(key), expense.serialize());
}

export function deleteExpense(expenseId: u64): void {
  const key = buildExpenseKey(expenseId);
  Storage.del(stringToBytes(key));
}

export function generateExpenseId(): u64 {
  let counter: u64 = 0;
  const keyBytes = stringToBytes(EXPENSE_COUNTER_KEY);
  if (Storage.has(keyBytes)) {
    counter = bytesToU64(Storage.get(keyBytes));
  }
  counter++;
  Storage.set(keyBytes, u64ToBytes(counter));
  return counter;
}

// ==========================================
// GROUP EXPENSES INDEX
// ==========================================

export function buildGroupExpensesKey(groupId: u64): string {
  return GROUP_EXPENSES_PREFIX + groupId.toString();
}

export function getGroupExpenseIds(groupId: u64): u64[] {
  const key = buildGroupExpensesKey(groupId);
  const keyBytes = stringToBytes(key);
  if (!Storage.has(keyBytes)) return [];

  const data = Storage.get(keyBytes);
  const args = new Args(data);
  const expenseIds: u64[] = [];
  const count = args.nextU32().unwrap();

  for (let i: u32 = 0; i < count; i++) {
    expenseIds.push(args.nextU64().unwrap());
  }
  return expenseIds;
}

export function addToGroupExpenses(groupId: u64, expenseId: u64): void {
  const expenseIds = getGroupExpenseIds(groupId);
  expenseIds.push(expenseId);
  saveGroupExpenseIds(groupId, expenseIds);
}

export function removeFromGroupExpenses(groupId: u64, expenseId: u64): void {
  const expenseIds = getGroupExpenseIds(groupId);
  const newIds: u64[] = [];
  for (let i = 0; i < expenseIds.length; i++) {
    if (expenseIds[i] != expenseId) {
      newIds.push(expenseIds[i]);
    }
  }
  saveGroupExpenseIds(groupId, newIds);
}

function saveGroupExpenseIds(groupId: u64, expenseIds: u64[]): void {
  const key = buildGroupExpensesKey(groupId);
  const args = new Args();
  args.add(u32(expenseIds.length));
  for (let i = 0; i < expenseIds.length; i++) {
    args.add(expenseIds[i]);
  }
  Storage.set(stringToBytes(key), args.serialize());
}

// ==========================================
// USER GROUPS INDEX
// ==========================================

export function buildUserGroupsKey(userAddress: string): string {
  return USER_GROUPS_PREFIX + userAddress;
}

export function getUserGroupIds(userAddress: string): u64[] {
  const key = buildUserGroupsKey(userAddress);
  const keyBytes = stringToBytes(key);
  if (!Storage.has(keyBytes)) return [];

  const data = Storage.get(keyBytes);
  const args = new Args(data);
  const groupIds: u64[] = [];
  const count = args.nextU32().unwrap();

  for (let i: u32 = 0; i < count; i++) {
    groupIds.push(args.nextU64().unwrap());
  }
  return groupIds;
}

export function addToUserGroups(userAddress: string, groupId: u64): void {
  const groupIds = getUserGroupIds(userAddress);
  // Check if already in list
  for (let i = 0; i < groupIds.length; i++) {
    if (groupIds[i] == groupId) return;
  }
  groupIds.push(groupId);
  saveUserGroupIds(userAddress, groupIds);
}

export function removeFromUserGroups(userAddress: string, groupId: u64): void {
  const groupIds = getUserGroupIds(userAddress);
  const newIds: u64[] = [];
  for (let i = 0; i < groupIds.length; i++) {
    if (groupIds[i] != groupId) {
      newIds.push(groupIds[i]);
    }
  }
  saveUserGroupIds(userAddress, newIds);
}

function saveUserGroupIds(userAddress: string, groupIds: u64[]): void {
  const key = buildUserGroupsKey(userAddress);
  const args = new Args();
  args.add(u32(groupIds.length));
  for (let i = 0; i < groupIds.length; i++) {
    args.add(groupIds[i]);
  }
  Storage.set(stringToBytes(key), args.serialize());
}

// ==========================================
// SETTLEMENT STORAGE
// ==========================================

export function buildSettlementKey(groupId: u64): string {
  return SETTLEMENT_PREFIX + groupId.toString();
}

export function getGroupSettlements(groupId: u64): Settlement[] {
  const key = buildSettlementKey(groupId);
  const keyBytes = stringToBytes(key);
  if (!Storage.has(keyBytes)) return [];

  const data = Storage.get(keyBytes);
  const args = new Args(data);
  const settlements: Settlement[] = [];
  const count = args.nextU32().unwrap();

  for (let i: u32 = 0; i < count; i++) {
    const settlementData = args.nextBytes().unwrap();
    const settlement = new Settlement();
    settlement.deserialize(settlementData, 0);
    settlements.push(settlement);
  }
  return settlements;
}

export function addSettlement(settlement: Settlement): void {
  const settlements = getGroupSettlements(settlement.groupId);
  settlements.push(settlement);
  saveGroupSettlements(settlement.groupId, settlements);
}

function saveGroupSettlements(groupId: u64, settlements: Settlement[]): void {
  const key = buildSettlementKey(groupId);
  const args = new Args();
  args.add(u32(settlements.length));
  for (let i = 0; i < settlements.length; i++) {
    args.add(settlements[i].serialize());
  }
  Storage.set(stringToBytes(key), args.serialize());
}

// ==========================================
// SETTLEMENT COUNTER
// ==========================================

const SETTLEMENT_COUNTER_KEY = "SETTLEMENT_COUNTER";

export function generateSettlementId(): u64 {
  let counter: u64 = 0;
  const keyBytes = stringToBytes(SETTLEMENT_COUNTER_KEY);
  if (Storage.has(keyBytes)) {
    counter = bytesToU64(Storage.get(keyBytes));
  }
  counter++;
  Storage.set(keyBytes, u64ToBytes(counter));
  return counter;
}
