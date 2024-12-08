import { useAccount, useReadContract, useWriteContract } from "wagmi";
import { FACTORY_ADDRESS, FACTORY_ABI, USECASE_ABI } from "@/config/contracts";
import { toast } from "@/hooks/use-toast";

interface Participant {
  address: string;
  rewardIndex: number;
  pendingRewards: bigint;
  claimedRewards: bigint;
  isLocked: boolean;
}

interface UseCaseStats {
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

export function useUseCase(useCaseId: bigint) {
  const { address } = useAccount();

  // Get use case contract address
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

  // Get participant rewards
  const { data: participantRewards } = useReadContract({
    address: useCaseAddress,
    abi: USECASE_ABI,
    functionName: "getParticipantRewards",
    args: [address!],
  });

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

  // Add new contract reads
  const { data: rewardPool } = useReadContract({
    address: useCaseAddress,
    abi: USECASE_ABI,
    functionName: "remainingRewardPool",
  });

  const { data: lockDuration } = useReadContract({
    address: useCaseAddress,
    abi: USECASE_ABI,
    functionName: "lockDuration",
  });

  const formatParticipants = (rewards: any) => {
    if (!rewards) return [];

    const [amounts, unlockTimes, rejected, claimed, participants] = rewards;
    const participantMap = new Map<string, Participant>();

    amounts.forEach((amount: bigint, index: number) => {
      const currentTimestamp = BigInt(Math.floor(Date.now() / 1000));
      const isLocked = BigInt(unlockTimes[index]) > currentTimestamp;
      const address = participants[index];

      if (!participantMap.has(address)) {
        participantMap.set(address, {
          address,
          pendingRewards: 0n,
          claimedRewards: 0n,
          isLocked: false,
          rewardIndex: index,
        });
      }

      const participant = participantMap.get(address)!;
      if (claimed[index]) {
        participant.claimedRewards += amount;
      } else if (!rejected[index]) {
        participant.pendingRewards += amount;
        participant.isLocked = participant.isLocked || isLocked;
      }
    });

    return Array.from(participantMap.values());
  };

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
  const useCase =
    useCaseStats && supportedEvents
      ? {
          id: useCaseId,
          address: useCaseAddress,
          owner,
          stats,
          events: {
            names: [...supportedEvents[0]],
            rewards: [...supportedEvents[1]],
          },
          participantRewards,
          participants: formatParticipants(participantRewards),
        }
      : null;

  return {
    // New API
    id: useCaseId,
    address: useCaseAddress,
    owner,
    stats,
    events: {
      names: useCase?.events.names ?? [],
      rewards: useCase?.events.rewards ?? [],
    },
    participantRewards,
    participants: formatParticipants(participantRewards),
    error: statsError || eventsError || ownerError,

    // Old API compatibility
    useCase,
    actions,
    isLoading: isAddressLoading || isStatsLoading,
  };
}
