import { Args, Result, Serializable } from '@massalabs/as-types';
import { Address } from '@massalabs/massa-as-sdk';
import { u256 } from 'as-bignum/assembly/integer/u256';

// Represents a debt between two people
// "from" owes "amount" to "to"
export class Balance implements Serializable {
  constructor(
    public from: Address = new Address(), // Who owes
    public to: Address = new Address(),   // To whom
    public amount: u256 = u256.Zero,      // How much
  ) {}

  serialize(): StaticArray<u8> {
    return new Args()
      .add(this.from.toString())
      .add(this.to.toString())
      .add(this.amount)
      .serialize();
  }

  deserialize(data: StaticArray<u8>, offset: i32): Result<i32> {
    const args = new Args(data, offset);

    this.from = new Address(args.nextString().unwrap());
    this.to = new Address(args.nextString().unwrap());
    this.amount = args.nextU256().unwrap();

    return new Result(args.offset);
  }
}

// Settlement record - tracks a payment made to settle debt
export class Settlement implements Serializable {
  constructor(
    public settlementId: u64 = 0,
    public groupId: u64 = 0,
    public from: Address = new Address(),
    public to: Address = new Address(),
    public amount: u256 = u256.Zero,
    public settledAt: u64 = 0,
  ) {}

  serialize(): StaticArray<u8> {
    return new Args()
      .add(this.settlementId)
      .add(this.groupId)
      .add(this.from.toString())
      .add(this.to.toString())
      .add(this.amount)
      .add(this.settledAt)
      .serialize();
  }

  deserialize(data: StaticArray<u8>, offset: i32): Result<i32> {
    const args = new Args(data, offset);

    this.settlementId = args.nextU64().unwrap();
    this.groupId = args.nextU64().unwrap();
    this.from = new Address(args.nextString().unwrap());
    this.to = new Address(args.nextString().unwrap());
    this.amount = args.nextU256().unwrap();
    this.settledAt = args.nextU64().unwrap();

    return new Result(args.offset);
  }
}
