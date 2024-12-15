import { useContractEvents } from "@/hooks/use-contract-event";
import { useAccount, useReadContract } from "wagmi";
import { USECASE_CONTRACT_ADDRESS, USECASE_ABI } from "@/config/contracts";
import { useState, useEffect } from "react";
import { UseCase, UseCaseInfo } from "@/types/types";

export function useUseCaseContract() {
  const { address } = useAccount();
  const [useCaseIds, setUseCaseIds] = useState<string[]>([]);

  // Listen for UseCaseCreated events
  const { data: creationEvents } = useContractEvents({
    address: USECASE_CONTRACT_ADDRESS,
    abi: USECASE_ABI,
    eventName: "UseCaseCreated",
  });

  // Update useCaseIds when new events are received
  useEffect(() => {
    if (creationEvents) {
      const ids = creationEvents
        .map((event) => (event as any)?.args?.id as string)
        .filter(Boolean);
      setUseCaseIds(ids);
    }
  }, [creationEvents]);

  // Fetch details for each use case
  const { data: useCasesData, isLoading } = useReadContract({
    address: USECASE_CONTRACT_ADDRESS,
    abi: USECASE_ABI,
    functionName: "getMultipleUseCaseInfo",
    args: [useCaseIds],
    query: {
      enabled: useCaseIds.length > 0,
    },
  });

  // Format the use cases data
  const useCases = useCasesData?.map((data: UseCaseInfo) => ({
    id: data.id,
    owner: data.owner,
    rewardPool: data.rewardPool,
    lockupPeriod: data.lockupPeriod,
    lockTime: data.lockTime,
    rewardsLocked: data.rewardsLocked,
    totalShares: data.totalShares,
    participants: data.participants,
  }));

  // Filter for user's own use cases
  const userUseCases = useCases?.filter(
    (useCase) => useCase.owner.toLowerCase() === address?.toLowerCase(),
  );

  return {
    useCases,
    userUseCases,
    isLoading,
    totalUseCases: useCases?.length ?? 0,
  };
}
