import { useContractEvents } from "@/hooks/use-contract-event";
import { TOKEN_ADDRESS, TOKEN_ABI } from "@/config/contracts";
import { type RewardTransfer } from "@/types/types";

export function useRewardTransfers() {
  const { data: events, isLoading } = useContractEvents({
    address: TOKEN_ADDRESS,
    abi: TOKEN_ABI,
    eventName: "RewardTransfer",
  });

  const transfers: RewardTransfer[] =
    events?.map((event) => ({
      from: (event as any).args.from,
      to: (event as any).args.to,
      amount: (event as any).args.amount,
      timestamp: Number((event as any).args.timestamp || event.blockNumber),
      transactionHash: event.transactionHash!,
      incentiveType: (event as any).args.incentiveType,
    })) || [];

  return { transfers, isLoading };
}
