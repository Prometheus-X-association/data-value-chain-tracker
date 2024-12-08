import { useReadContract } from "wagmi";
import { USECASE_ABI } from "@/config/contracts";

export function useUseCaseReader(useCaseAddress?: `0x${string}`) {
  const { data: useCaseStats, isLoading: isStatsLoading } = useReadContract({
    address: useCaseAddress,
    abi: USECASE_ABI,
    functionName: "getUseCaseStats",
  });

  const { data: supportedEvents } = useReadContract({
    address: useCaseAddress,
    abi: USECASE_ABI,
    functionName: "getSupportedEvents",
  });

  const { data: owner } = useReadContract({
    address: useCaseAddress,
    abi: USECASE_ABI,
    functionName: "owner",
  });

  const { data: lockDuration } = useReadContract({
    address: useCaseAddress,
    abi: USECASE_ABI,
    functionName: "lockDuration",
  });

  return {
    useCaseStats,
    supportedEvents,
    owner,
    lockDuration,
    isLoading: isStatsLoading,
  };
}
