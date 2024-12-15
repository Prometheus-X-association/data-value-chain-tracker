import { Address, Log } from "viem";

export interface Participant {
  participant: Address;
  rewardShare: bigint;
  fixedReward: bigint;
}

export interface UseCaseInfo {
  id: string;
  owner: Address;
  rewardPool: bigint;
  lockupPeriod: bigint;
  lockTime: bigint;
  rewardsLocked: boolean;
  totalShares: bigint;
  participants: readonly Participant[];
}

export interface RewardTransfer {
  from: Address;
  to: Address;
  amount: bigint;
  timestamp: number;
  transactionHash: string;
  incentiveType: string;
}
