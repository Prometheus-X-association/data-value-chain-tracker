import { Log } from "viem";

export interface UseCase {
  id: bigint;
  address: `0x${string}`;
  owner: `0x${string}`;
  events: {
    names: string[];
    rewards: bigint[];
  };
  stats: UseCaseStats;
  participants: `0x${string}`[];
  participantsRewards: Reward[];
}

export interface UseCaseStats {
  totalAllocated: bigint;
  totalClaimed: bigint;
  totalRejected: bigint;
  totalPending: bigint;
  rewardPool: bigint;
  remainingRewardPool: bigint;
  isActive: boolean;
  lockDuration: bigint;
  eventCount: number;
}

export interface Participant {
  address: `0x${string}`;
  rewardIndex: number;
  pendingRewards: bigint;
  claimedRewards: bigint;
  isLocked: boolean;
}

export interface Reward {
  participant: `0x${string}`;
  amount: bigint;
  unlockTime: bigint;
  rejected: boolean;
  claimed: boolean;
  eventType: `0x${string}`;
  eventName: string;
}

export interface RewardAllocatedEventLog extends Log {
  args: RewardAllocatedEvent;
}

export interface RewardAllocatedEvent {
  participant: `0x${string}`;
  eventTypeHash: string;
  eventName: string;
  amount: bigint;
  unlockTime: bigint;
}

export const mapRewardAllocatedEvents = (
  events?: RewardAllocatedEventLog[],
): RewardAllocatedEvent[] => {
  if (!events?.length) return [];

  return events.map((event) => event.args);
};
