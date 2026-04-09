import { USECASE_ABI, USECASE_CONTRACT_ADDRESS } from "@/config/contracts";
import { useContractEvents } from "@/hooks/use-contract-event";
import { useMemo } from "react";

interface RewardsClaimedEvent {
  args: {
    useCaseId?: string;
    participant?: string;
    amount?: bigint;
  };
}

export function useUseCaseClaims(useCaseId: string) {
  const { data, isLoading } = useContractEvents<RewardsClaimedEvent>({
    address: USECASE_CONTRACT_ADDRESS,
    abi: USECASE_ABI,
    eventName: "RewardsClaimed",
  });

  const claimedByParticipant = useMemo(() => {
    const totals = new Map<string, bigint>();

    (data || []).forEach((event) => {
      const eventUseCaseId = String(event?.args?.useCaseId || "");
      const participant = String(event?.args?.participant || "").toLowerCase();
      const amount = event?.args?.amount;

      if (!participant || amount === undefined || eventUseCaseId !== useCaseId) {
        return;
      }

      totals.set(participant, (totals.get(participant) || 0n) + amount);
    });

    return totals;
  }, [data, useCaseId]);

  return {
    claimedByParticipant,
    isLoading,
  };
}
