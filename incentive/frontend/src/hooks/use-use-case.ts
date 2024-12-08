import { useAccount, useReadContract, useWriteContract } from "wagmi";
import { FACTORY_ADDRESS, FACTORY_ABI, USECASE_ABI } from "@/config/contracts";
import {
  mapRewardAllocatedEvents,
  RewardAllocatedEventLog,
  UseCase,
  UseCaseStats,
} from "@/types/types";
import { useContractEvents } from "./use-contract-event";

export function useUseCase(useCaseId: bigint) {
  const { address } = useAccount();

  // Get use case contract address from id
  const { data: useCaseAddress, isLoading: isAddressLoading } = useReadContract(
    {
      address: FACTORY_ADDRESS,
      abi: FACTORY_ABI,
      functionName: "useCaseContracts",
      args: [useCaseId],
    },
  );

  // Get use case details
  const {
    data: useCaseStats,
    isLoading: isStatsLoading,
    error: statsError,
  } = useReadContract({
    address: useCaseAddress,
    abi: USECASE_ABI,
    functionName: "getUseCaseStats",
  });

  // Get supported events
  const { data: supportedEvents, error: eventsError } = useReadContract({
    address: useCaseAddress,
    abi: USECASE_ABI,
    functionName: "getSupportedEvents",
  });

  const { data: participantsData } = useContractEvents({
    address: useCaseAddress,
    abi: USECASE_ABI,
    eventName: "RewardAllocated",
  });

  const participants = mapRewardAllocatedEvents(
    participantsData as RewardAllocatedEventLog[],
  );
  const participantsAddresses = participants.map(
    (participant) => participant.participant,
  );

  // Get owner
  const { data: owner, error: ownerError } = useReadContract({
    address: useCaseAddress,
    abi: USECASE_ABI,
    functionName: "owner",
  });

  // Write contract functions
  const { writeContract } = useWriteContract();

  // Contract actions
  const actions = {
    claimRewards: () =>
      writeContract({
        address: useCaseAddress!,
        abi: USECASE_ABI,
        functionName: "claimRewards",
      }),

    pause: () =>
      writeContract({
        address: useCaseAddress!,
        abi: USECASE_ABI,
        functionName: "pause",
      }),

    rejectReward: (participant: string, rewardIndex: number) =>
      writeContract({
        address: useCaseAddress!,
        abi: USECASE_ABI,
        functionName: "rejectReward",
        args: [participant as `0x${string}`, BigInt(rewardIndex)],
      }),

    unpause: () =>
      writeContract({
        address: useCaseAddress!,
        abi: USECASE_ABI,
        functionName: "unpause",
      }),

    batchRejectRewards: (participants: string[], rewardIndices: bigint[]) =>
      writeContract({
        address: useCaseAddress!,
        abi: USECASE_ABI,
        functionName: "batchRejectRewards",
        args: [participants.map((p) => p as `0x${string}`), rewardIndices],
      }),

    topUpRewardPool: (amount: bigint) =>
      writeContract({
        address: useCaseAddress!,
        abi: USECASE_ABI,
        functionName: "topUpRewardPool",
        args: [amount],
      }),

    withdrawUnusedRewards: () =>
      writeContract({
        address: useCaseAddress!,
        abi: USECASE_ABI,
        functionName: "withdrawUnusedRewards",
      }),

    emergencyWithdraw: () =>
      writeContract({
        address: useCaseAddress!,
        abi: USECASE_ABI,
        functionName: "emergencyWithdraw",
      }),
  };

  const { data: lockDuration } = useReadContract({
    address: useCaseAddress,
    abi: USECASE_ABI,
    functionName: "lockDuration",
  });

  // Format the stats
  const stats: UseCaseStats = {
    totalAllocated: useCaseStats?.[0] ?? 0n,
    totalClaimed: useCaseStats?.[1] ?? 0n,
    totalRejected: useCaseStats?.[2] ?? 0n,
    totalPending: useCaseStats?.[3] ?? 0n,
    rewardPool: useCaseStats?.[4] ?? 0n,
    remainingRewardPool: useCaseStats?.[5] ?? 0n,
    isActive: !useCaseStats?.[6],
    lockDuration: lockDuration ?? 0n,
    eventCount: supportedEvents?.[0].length ?? 0,
  };

  // Format the return data
  const useCase = {
    id: useCaseId,
    address: useCaseAddress,
    owner,
    stats,
    events: {
      names: supportedEvents?.[0] ?? [],
      rewards: supportedEvents?.[1] ?? [],
    },
    participants: participantsAddresses,
  } as UseCase;

  return {
    useCase,
    actions,
    isLoading: isAddressLoading || isStatsLoading,
    error: statsError || eventsError || ownerError,
  };
}
