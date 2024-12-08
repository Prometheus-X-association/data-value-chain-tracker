import { useAccount, useReadContract, useReadContracts } from "wagmi";
import {
  FACTORY_ADDRESS,
  FACTORY_ABI,
  TOKEN_ADDRESS,
  TOKEN_ABI,
  USECASE_ABI,
} from "@/config/contracts";
import { formatEther } from "viem";

export interface UseCase {
  id: bigint;
  address: `0x${string}`;
  rewardPool: bigint;
  remainingRewardPool: bigint;
  lockDuration: bigint;
  eventCount: number;
  isActive: boolean;
  owner: string;
  stats: {
    totalAllocated: bigint;
    totalClaimed: bigint;
    totalRejected: bigint;
    totalPending: bigint;
  };
}

interface ParticipantRewards {
  amounts: readonly bigint[];
  unlockTimes: readonly bigint[];
  rejected: readonly boolean[];
  claimed: readonly boolean[];
  eventTypes: readonly string[];
  eventNames: readonly string[];
}

export function useUseCaseContracts() {
  const { address } = useAccount();

  // Get user's PTX balance
  const { data: balance } = useReadContract({
    address: TOKEN_ADDRESS,
    abi: TOKEN_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
  });

  // Get all use case IDs
  const { data: totalUseCases } = useReadContract({
    address: FACTORY_ADDRESS,
    abi: FACTORY_ABI,
    functionName: "nextUseCaseId",
  });

  // Get all use case addresses
  const { data: allUseCaseAddresses } = useReadContract({
    address: FACTORY_ADDRESS,
    abi: FACTORY_ABI,
    functionName: "getUseCaseAddresses",
    args: totalUseCases
      ? [[...Array(Number(totalUseCases))].map((_, i) => BigInt(i))]
      : undefined,
  });

  // Read from all use case contracts
  const { data: useCaseDetails } = useReadContracts({
    contracts:
      allUseCaseAddresses
        ?.map((address) => [
          {
            address,
            abi: USECASE_ABI,
            functionName: "getUseCaseStats",
            args: [],
          },
          {
            address,
            abi: USECASE_ABI,
            functionName: "owner",
            args: [],
          },
          {
            address,
            abi: USECASE_ABI,
            functionName: "getSupportedEvents",
          },
        ])
        .flat() || [],
  });

  const useCases =
    useCaseDetails?.reduce((acc: UseCase[], detail, index) => {
      // Process only the first item in each group of 3
      if (index % 3 === 0) {
        const stats = detail.result as readonly [
          bigint,
          bigint,
          bigint,
          bigint,
          bigint,
          bigint,
          boolean,
        ];
        const [
          totalAllocated,
          totalClaimed,
          totalRejected,
          totalPending,
          rewardPool,
          remainingRewardPool,
          isActive,
        ] = stats;

        // Get owner from the next item in the group
        const owner =
          (useCaseDetails[index + 1]?.result as `0x${string}`) ?? "";

        // Get events from the third item in the group
        const events = useCaseDetails[index + 2]?.result ?? [[], []];
        const eventCount = (events as [string[], bigint[]])[0].length;

        acc.push({
          id: BigInt(Math.floor(index / 3)),
          address: allUseCaseAddresses?.[Math.floor(index / 3)] ?? "0x",
          rewardPool,
          remainingRewardPool,
          lockDuration: BigInt(0),
          eventCount,
          isActive: !isActive,
          owner,
          stats: {
            totalAllocated,
            totalClaimed,
            totalRejected,
            totalPending,
          },
        });
      }
      return acc;
    }, []) || [];

  const ownedUseCases = useCases.filter((uc) => uc.owner === address);

  // Get participation data
  const { data: participationData } = useReadContracts({
    contracts: useCases.map((uc) => ({
      address: uc.address,
      abi: USECASE_ABI,
      functionName: "getParticipantRewards",
      args: [address!],
    })),
  });

  // Filter participated use cases using the participation data
  const participatedUseCases = useCases.filter((uc, index) => {
    const [amounts] = (participationData?.[index]?.result ?? [
      [],
      [],
      [],
      [],
      [],
      [],
    ]) as [
      readonly bigint[],
      readonly bigint[],
      readonly boolean[],
      readonly boolean[],
      readonly string[],
      readonly string[],
    ];
    return amounts.length > 0;
  });

  return {
    useCases,
    ownedUseCases,
    participatedUseCases,
    ptxBalance: balance ? formatEther(balance) : "0",
  };
}
