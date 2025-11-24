import { Args, Result, Serializable } from '@massalabs/as-types';
import { Address } from '@massalabs/massa-as-sdk';
import { u256 } from 'as-bignum/assembly/integer/u256';
import { GroupStatus } from '../helpers/enums';

export class Group implements Serializable {
  constructor(
    public groupId: u64 = 0,
    public name: string = '',
    public creator: Address = new Address(),
    public members: Address[] = [],
    public createdAt: u64 = 0,
    public settlementDate: u64 = 0, // 0 = manual settlement only
    public status: GroupStatus = GroupStatus.Active,
    public totalExpenses: u256 = u256.Zero,
    public expenseCount: u32 = 0,
  ) {}

  serialize(): StaticArray<u8> {
    const membersArgs = new Args();
    for (let i: i32 = 0; i < i32(this.members.length); i++) {
      membersArgs.add(this.members[i].toString());
    }

    return new Args()
      .add(this.groupId)
      .add(this.name)
      .add(this.creator.toString())
      .add(u32(this.members.length))
      .add(membersArgs.serialize())
      .add(this.createdAt)
      .add(this.settlementDate)
      .add(this.status as u8)
      .add(this.totalExpenses)
      .add(this.expenseCount)
      .serialize();
  }

  deserialize(data: StaticArray<u8>, offset: i32): Result<i32> {
    const args = new Args(data, offset);

    this.groupId = args.nextU64().unwrap();
    this.name = args.nextString().unwrap();
    this.creator = new Address(args.nextString().unwrap());

    const membersLength = args.nextU32().unwrap();
    this.members = [];
    if (membersLength > 0) {
      const membersData = args.nextBytes().unwrap();
      const membersArgs = new Args(membersData);
      for (let i: i32 = 0; i < i32(membersLength); i++) {
        this.members.push(new Address(membersArgs.nextString().unwrap()));
      }
    }

    this.createdAt = args.nextU64().unwrap();
    this.settlementDate = args.nextU64().unwrap();
    this.status = args.nextU8().unwrap() as GroupStatus;
    this.totalExpenses = args.nextU256().unwrap();
    this.expenseCount = args.nextU32().unwrap();

    return new Result(args.offset);
  }

  // Helper: check if address is a member
  isMember(address: Address): bool {
    for (let i: i32 = 0; i < i32(this.members.length); i++) {
      if (this.members[i].toString() == address.toString()) {
        return true;
      }
    }
    return false;
  }

  // Helper: add a member
  addMember(address: Address): void {
    if (!this.isMember(address)) {
      this.members.push(address);
    }
  }

  // Helper: remove a member
  removeMember(address: Address): void {
    const newMembers: Address[] = [];
    for (let i: i32 = 0; i < i32(this.members.length); i++) {
      if (this.members[i].toString() != address.toString()) {
        newMembers.push(this.members[i]);
      }
    }
    this.members = newMembers;
  }
}
