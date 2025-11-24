import { u256 } from 'as-bignum/assembly';

// Convert days to milliseconds
export function daysToMilliseconds(days: u64): u64 {
  return days * 24 * 60 * 60 * 1000;
}

// Convert milliseconds to days
export function millisecondsToDays(ms: u64): u64 {
  return ms / (24 * 60 * 60 * 1000);
}

// Check if an array contains a value
export function arrayContains<T>(arr: T[], value: T): bool {
  for (let i = 0; i < arr.length; i++) {
    if (arr[i] == value) return true;
  }
  return false;
}

// Remove value from array (returns new array)
export function arrayRemove<T>(arr: T[], value: T): T[] {
  const result: T[] = [];
  for (let i = 0; i < arr.length; i++) {
    if (arr[i] != value) {
      result.push(arr[i]);
    }
  }
  return result;
}

// Safe division for u256
export function safeDivide(amount: u256, divisor: u64): u256 {
  if (divisor == 0) return u256.Zero;
  return u256.div(amount, u256.fromU64(divisor));
}

// Truncate address for display
export function truncateAddress(address: string): string {
  if (address.length <= 12) return address;
  return address.substring(0, 6) + "..." + address.substring(address.length - 4);
}
