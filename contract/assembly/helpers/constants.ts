import { u256 } from 'as-bignum/assembly';

// Time constants (in milliseconds)
export const ONE_MINUTE: u64 = 60_000;
export const ONE_HOUR: u64 = ONE_MINUTE * 60;
export const ONE_DAY: u64 = ONE_HOUR * 24;
export const ONE_WEEK: u64 = ONE_DAY * 7;

// Storage key prefixes
export const GROUP_PREFIX: string = "GROUP:";
export const EXPENSE_PREFIX: string = "EXPENSE:";
export const GROUP_EXPENSES_PREFIX: string = "GROUP_EXP:";
export const USER_GROUPS_PREFIX: string = "USER_GROUPS:";
export const SETTLEMENT_PREFIX: string = "SETTLEMENT:";

// Counters
export const GROUP_COUNTER_KEY: string = "GROUP_COUNTER";
export const EXPENSE_COUNTER_KEY: string = "EXPENSE_COUNTER";

// Limits
export const MAX_MEMBERS_PER_GROUP: u8 = 20;
export const MAX_EXPENSES_PER_GROUP: u32 = 500;
export const MAX_DESCRIPTION_LENGTH: u32 = 200;
export const MAX_GROUP_NAME_LENGTH: u32 = 50;

// Gas for ASC calls
export const MAX_GAS_ASC_CALL: u64 = 1_000_000_000;

// Minimum amounts
export const MIN_EXPENSE_AMOUNT: u256 = u256.fromU64(1_000_000); // 0.001 MAS in nanoMAS
