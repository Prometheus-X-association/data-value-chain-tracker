import { useContractEvents as useContractEvent } from "@/hooks/use-contract-event";
import {
  TOKEN_ADDRESS,
  TOKEN_ABI,
  USECASE_CONTRACT_ADDRESS,
  USECASE_ABI,
} from "@/config/contracts";
import { Address } from "viem";

export type EventType =
  | "RewardTransfer"
  | "RewardsClaimed"
  | "RewardsDeposited"
  | "RewardsLocked"
  | "UseCaseCreated"
  | "EmergencyWithdrawal";

interface BaseEvent {
  blockNumber: bigint;
  blockTimestamp: bigint;
  transactionHash: `0x${string}`;
  eventName: EventType;
}

interface RewardTransferEvent extends BaseEvent {
  eventName: "RewardTransfer";
  args: {
    from: Address;
    to: Address;
    amount: bigint;
    incentiveType: string;
  };
}

interface RewardsClaimedEvent extends BaseEvent {
  eventName: "RewardsClaimed";
  args: {
    useCaseId: string;
    participant: Address;
    amount: bigint;
  };
}

interface RewardsDepositedEvent extends BaseEvent {
  eventName: "RewardsDeposited";
  args: {
    useCaseId: string;
    amount: bigint;
  };
}

interface RewardsLockedEvent extends BaseEvent {
  eventName: "RewardsLocked";
  args: {
    useCaseId: string;
    lockupPeriod: bigint;
  };
}

interface UseCaseCreatedEvent extends BaseEvent {
  eventName: "UseCaseCreated";
  args: {
    id: string;
    owner: Address;
  };
}

interface EmergencyWithdrawalEvent extends BaseEvent {
  eventName: "EmergencyWithdrawal";
  args: {
    useCaseId: string;
    owner: Address;
    amount: bigint;
  };
}

type ContractEvent =
  | RewardTransferEvent
  | RewardsClaimedEvent
  | RewardsDepositedEvent
  | RewardsLockedEvent
  | UseCaseCreatedEvent
  | EmergencyWithdrawalEvent;

export function useContractEvents(filter?: EventType[]) {
  const { data: rewardTransfers, isLoading: isLoadingTransfers } =
    useContractEvent<RewardTransferEvent>({
      address: TOKEN_ADDRESS,
      abi: TOKEN_ABI,
      eventName: "RewardTransfer",
    });

  const { data: rewardsClaimed, isLoading: isLoadingClaimed } =
    useContractEvent<RewardsClaimedEvent>({
      address: USECASE_CONTRACT_ADDRESS,
      abi: USECASE_ABI,
      eventName: "RewardsClaimed",
    });

  const { data: rewardsDeposited, isLoading: isLoadingDeposited } =
    useContractEvent<RewardsDepositedEvent>({
      address: USECASE_CONTRACT_ADDRESS,
      abi: USECASE_ABI,
      eventName: "RewardsDeposited",
    });

  const { data: rewardsLocked, isLoading: isLoadingLocked } =
    useContractEvent<RewardsLockedEvent>({
      address: USECASE_CONTRACT_ADDRESS,
      abi: USECASE_ABI,
      eventName: "RewardsLocked",
    });

  const { data: useCasesCreated, isLoading: isLoadingCreated } =
    useContractEvent<UseCaseCreatedEvent>({
      address: USECASE_CONTRACT_ADDRESS,
      abi: USECASE_ABI,
      eventName: "UseCaseCreated",
    });

  const { data: emergencyWithdrawals, isLoading: isLoadingWithdrawals } =
    useContractEvent<EmergencyWithdrawalEvent>({
      address: USECASE_CONTRACT_ADDRESS,
      abi: USECASE_ABI,
      eventName: "EmergencyWithdrawal",
    });

  const isLoading =
    isLoadingTransfers ||
    isLoadingClaimed ||
    isLoadingDeposited ||
    isLoadingLocked ||
    isLoadingCreated ||
    isLoadingWithdrawals;

  // Create a Set to track unique events
  const uniqueEvents = new Set<string>();
  const allEvents: ContractEvent[] = [
    ...(rewardTransfers || []),
    ...(rewardsClaimed || []),
    ...(rewardsDeposited || []),
    ...(rewardsLocked || []),
    ...(useCasesCreated || []),
    ...(emergencyWithdrawals || []),
  ]
    .filter((event) => {
      // Create a unique key for each event
      const key = `${event.eventName}-${event.blockNumber}-${event.transactionHash}`;
      // Only include the event if we haven't seen it before
      if (uniqueEvents.has(key)) return false;
      uniqueEvents.add(key);
      return true;
    })
    .sort((a, b) => Number(b.blockTimestamp - a.blockTimestamp));

  const filteredEvents = filter
    ? allEvents.filter((event) => filter.includes(event.eventName))
    : allEvents;

  return { events: filteredEvents, isLoading };
}
