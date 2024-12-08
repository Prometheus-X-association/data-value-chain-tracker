import { useReadContract, useWriteContract } from "wagmi";
import { FACTORY_ADDRESS, FACTORY_ABI } from "@/config/contracts";

export function useFactoryContract() {
  // Read functions
  const { data: nextUseCaseId } = useReadContract({
    address: FACTORY_ADDRESS,
    abi: FACTORY_ABI,
    functionName: "nextUseCaseId",
  });

  const { data: useCaseContracts } = useReadContract({
    address: FACTORY_ADDRESS,
    abi: FACTORY_ABI,
    functionName: "useCaseContracts",
  });

  // Write functions
  const { writeContract: createUseCase } = useWriteContract();

  const handleCreateUseCase = async (
    lockDuration: bigint,
    eventNames: string[],
    baseRewards: bigint[],
    rewardPoolAmount: bigint,
  ) => {
    return createUseCase({
      address: FACTORY_ADDRESS,
      abi: FACTORY_ABI,
      functionName: "createUseCase",
      args: [lockDuration, eventNames, baseRewards, rewardPoolAmount],
    });
  };

  return {
    nextUseCaseId,
    useCaseContracts,
    createUseCase: handleCreateUseCase,
  };
}
