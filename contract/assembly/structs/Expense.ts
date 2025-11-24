import { Args, Result, Serializable } from '@massalabs/as-types';
import { Address } from '@massalabs/massa-as-sdk';
import { u256 } from 'as-bignum/assembly/integer/u256';
import { ExpenseCategory } from '../helpers/enums';

export class Expense implements Serializable {
  constructor(
    public expenseId: u64 = 0,
    public groupId: u64 = 0,
    public description: string = '',
    public amount: u256 = u256.Zero, // Amount in nanoMAS
    public paidBy: Address = new Address(), // Who paid
    public splitBetween: Address[] = [], // Who shares this expense
    public createdAt: u64 = 0,
    public category: ExpenseCategory = ExpenseCategory.Other,
  ) {}

  serialize(): StaticArray<u8> {
    const splitArgs = new Args();
    for (let i: i32 = 0; i < i32(this.splitBetween.length); i++) {
      splitArgs.add(this.splitBetween[i].toString());
    }

    return new Args()
      .add(this.expenseId)
      .add(this.groupId)
      .add(this.description)
      .add(this.amount)
      .add(this.paidBy.toString())
      .add(u32(this.splitBetween.length))
      .add(splitArgs.serialize())
      .add(this.createdAt)
      .add(this.category as u8)
      .serialize();
  }

  deserialize(data: StaticArray<u8>, offset: i32): Result<i32> {
    const args = new Args(data, offset);

    this.expenseId = args.nextU64().unwrap();
    this.groupId = args.nextU64().unwrap();
    this.description = args.nextString().unwrap();
    this.amount = args.nextU256().unwrap();
    this.paidBy = new Address(args.nextString().unwrap());

    const splitLength = args.nextU32().unwrap();
    this.splitBetween = [];
    if (splitLength > 0) {
      const splitData = args.nextBytes().unwrap();
      const splitArgs = new Args(splitData);
      for (let i: i32 = 0; i < i32(splitLength); i++) {
        this.splitBetween.push(new Address(splitArgs.nextString().unwrap()));
      }
    }

    this.createdAt = args.nextU64().unwrap();
    this.category = args.nextU8().unwrap() as ExpenseCategory;

    return new Result(args.offset);
  }

  // Helper: get amount per person (equal split)
  getAmountPerPerson(): u256 {
    if (this.splitBetween.length == 0) return u256.Zero;
    return u256.div(this.amount, u256.fromU64(u64(this.splitBetween.length)));
  }

  // Helper: check if address is part of split
  isInSplit(address: Address): bool {
    for (let i: i32 = 0; i < i32(this.splitBetween.length); i++) {
      if (this.splitBetween[i].toString() == address.toString()) {
        return true;
      }
    }
    return false;
  }
}
