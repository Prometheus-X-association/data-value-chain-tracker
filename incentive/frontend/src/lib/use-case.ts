import type { Participant, UseCase, UseCaseStats } from "@/types/types";

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

export const mapUseCasesData = (useCasesData?: any[]) => {
  if (!useCasesData) return [];

  const processedUseCases: UseCase[] = [];

  console.log(useCasesData);

  // Data comes in groups of 4 (stats, events, owner, participantRewards)
  for (let i = 0; i < useCasesData.length; i += 4) {
    const useCaseStats = useCasesData[i]?.result;
    const supportedEvents = useCasesData[i + 1]?.result;
    const owner = useCasesData[i + 2]?.result;
    const participantRewards = useCasesData[i + 3]?.result;

    // Skip if any critical data is missing
    if (!useCaseStats || !supportedEvents || !owner) continue;

    const stats: UseCaseStats = {
      totalAllocated: useCaseStats[0] ?? 0n,
      totalClaimed: useCaseStats[1] ?? 0n,
      totalRejected: useCaseStats[2] ?? 0n,
      totalPending: useCaseStats[3] ?? 0n,
      rewardPool: useCaseStats[4] ?? 0n,
      remainingRewardPool: useCaseStats[5] ?? 0n,
      isActive: !useCaseStats[6],
      lockDuration: useCaseStats[7] ?? 0n,
      eventCount: supportedEvents[0]?.length ?? 0,
    };

    const useCase: UseCase = {
      id: BigInt(i / 4), // Adjust ID calculation for groups of 4
      address: useCasesData[i]?.result as `0x${string}`,
      owner,
      stats,
      events: {
        names: supportedEvents[0] ?? [],
        rewards: supportedEvents[1] ?? [],
      },
      participants: [], // This would come from events if needed
      participantsRewards: participantRewards ?? [], // Add the participant rewards
    };

    console.log("use case", useCase);

    processedUseCases.push(useCase);
  }

  return processedUseCases;
};
