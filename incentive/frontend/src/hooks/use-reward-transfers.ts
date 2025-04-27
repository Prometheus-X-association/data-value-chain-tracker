import { useContractEvents } from "@/hooks/use-contract-event";
import { TOKEN_ADDRESS, TOKEN_ABI } from "@/config/contracts";
import { type RewardTransfer } from "@/types/types";
import { Address } from "viem";

interface TransferEvent {
  args: {
    from: Address;
    to: Address;
    amount: bigint;
    incentiveType: string;
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

  const transfers: RewardTransfer[] =
    events
      ?.filter(
        (event): event is TransferEvent =>
          event?.args?.from !== undefined &&
          event?.args?.to !== undefined &&
          event?.args?.amount !== undefined &&
          event?.blockTimestamp !== undefined,
      )
      .map((event) => ({
        from: event.args.from,
        to: event.args.to,
        amount: event.args.amount,
        timestamp: Number(event.blockTimestamp.toString()) * 1000,
        transactionHash: event.transactionHash,
        incentiveType: event.args.incentiveType,
      })) || [];

  return { transfers, isLoading };
}
