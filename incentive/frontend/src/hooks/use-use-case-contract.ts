import { useContractEvents } from "@/hooks/use-contract-event";
import { useAccount, useReadContract } from "wagmi";
import { USECASE_CONTRACT_ADDRESS, USECASE_ABI } from "@/config/contracts";
import { useState, useEffect } from "react";
import { UseCaseInfo } from "@/types/types";

interface CreationEvent {
  args: {
    id: string;
  }
}

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
        .map((event) => (event as unknown as CreationEvent)?.args?.id)
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
  const useCases = useCasesData?.map((data) => data as UseCaseInfo);

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
