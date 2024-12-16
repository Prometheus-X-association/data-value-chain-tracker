import { useContractEvents } from "@/hooks/use-contract-event";
import { TOKEN_ADDRESS, TOKEN_ABI } from "@/config/contracts";
import { type RewardTransfer } from "@/types/types";
import { Address } from "viem";

interface TransferEvent {
  args: {
    useCaseId: string;
    owner: Address;
    amount: bigint;
  };
  blockNumber: bigint;
  blockTimestamp: bigint;
  transactionHash: `0x${string}`;
}

export function useRewardTransfers() {
  const { data: events, isLoading } = useContractEvents<TransferEvent>({
    address: TOKEN_ADDRESS,
    abi: TOKEN_ABI,
    eventName: "RewardTransfer",
  });

  const transfers: RewardTransfer[] = events
    ?.filter((event): event is TransferEvent => 
      event?.args?.owner !== undefined && 
      event?.args?.amount !== undefined
    )
    .map((event) => ({
      from: event.args.owner,
      to: event.args.owner,
      amount: event.args.amount,
      timestamp: Number(event.blockTimestamp),
      transactionHash: event.transactionHash,
      incentiveType: event.args.useCaseId,
    })) || [];

  return { transfers, isLoading };
}
