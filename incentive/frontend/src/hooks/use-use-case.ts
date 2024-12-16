import { useReadContract, useWriteContract } from "wagmi";
import { USECASE_CONTRACT_ADDRESS, USECASE_ABI } from "@/config/contracts";
import { Address } from "viem";

export function useUseCase(id: string) {
  // Read use case data
  const {
    data: useCaseData,
    isLoading,
    error,
    refetch,
  } = useReadContract({
    address: USECASE_CONTRACT_ADDRESS,
    abi: USECASE_ABI,
    functionName: "getUseCaseInfo",
    args: [id],
  });

  // Write contract functions
  const { writeContractAsync } = useWriteContract();

  // Format the use case data
  const useCase = useCaseData
    ? {
        id: useCaseData.id,
        owner: useCaseData.owner,
        totalRewardPool: useCaseData.totalRewardPool,
        remainingRewardPool: useCaseData.remainingRewardPool,
        lockupPeriod: useCaseData.lockupPeriod,
        lockTime: useCaseData.lockTime,
        rewardsLocked: useCaseData.rewardsLocked,
        totalShares: useCaseData.totalShares,
        participants: useCaseData.participants,
      }
    : null;

  // Contract actions
  const actions = {
    depositRewards: async (amount: bigint) => {
      return writeContractAsync({
        address: USECASE_CONTRACT_ADDRESS,
        abi: USECASE_ABI,
        functionName: "depositRewards",
        args: [id, amount],
      });
    },
    updateRewardShares: async (participants: Address[], shares: bigint[]) => {
      return writeContractAsync({
        address: USECASE_CONTRACT_ADDRESS,
        abi: USECASE_ABI,
        functionName: "updateRewardShares",
        args: [id, participants, shares],
      });
    },
    addFixedRewards: async (participants: Address[], amounts: bigint[]) => {
      return writeContractAsync({
        address: USECASE_CONTRACT_ADDRESS,
        abi: USECASE_ABI,
        functionName: "addFixedRewards",
        args: [id, participants, amounts],
      });
    },
    lockRewards: async (lockupPeriod: bigint) => {
      return writeContractAsync({
        address: USECASE_CONTRACT_ADDRESS,
        abi: USECASE_ABI,
        functionName: "lockRewards",
        args: [id, Number(lockupPeriod)],
      });
    },
    claimRewards: async () => {
      return writeContractAsync({
        address: USECASE_CONTRACT_ADDRESS,
        abi: USECASE_ABI,
        functionName: "claimRewards",
        args: [id],
      });
    },
  };

  return {
    useCase,
    isLoading,
    error,
    actions,
    refetch,
  };
}
