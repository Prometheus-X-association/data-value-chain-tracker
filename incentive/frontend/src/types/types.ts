import { Address } from "viem";

export interface Participant {
  participant: Address;
  rewardShare: bigint;
  fixedReward: bigint;
}

export interface UseCaseInfo {
  id: string;
  owner: Address;
  totalRewardPool: bigint;
  remainingRewardPool: bigint;
  lockupPeriod: number;
  lockTime: number;
  rewardsLocked: boolean;
  totalShares: bigint;
  participants: readonly Participant[];
}

export interface RewardTransfer {
  from: string;
  to: string;
  amount: bigint;
  timestamp: number;
  transactionHash: `0x${string}`;
  incentiveType: string;
}
