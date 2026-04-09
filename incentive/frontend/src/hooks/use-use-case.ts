import { waitForTransactionReceipt } from "@wagmi/core";
import { useAccount, usePublicClient, useReadContract, useWriteContract } from "wagmi";
import {
  TOKEN_ABI,
  TOKEN_ADDRESS,
  USECASE_CONTRACT_ADDRESS,
  USECASE_ABI,
} from "@/config/contracts";
import { config } from "@/providers/web3";
import { Address } from "viem";
import { useEffect, useState } from "react";
import { UseCaseMetadata } from "@/types/types";

function getUseCaseMetadataUrl(id: string) {
  const encodedId = encodeURIComponent(id);

  if (typeof window !== "undefined") {
    return `${window.location.origin}/incentive/core-api/api/incentive-use-case-metadata/${encodedId}`;
  }

  return `http://127.0.0.1:3001/api/incentive-use-case-metadata/${encodedId}`;
}

export function useUseCase(id: string) {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const [metadata, setMetadata] = useState<UseCaseMetadata | null>(null);

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

  useEffect(() => {
    let isCancelled = false;

    async function loadMetadata() {
      if (!id) {
        setMetadata(null);
        return;
      }

      try {
        const response = await fetch(getUseCaseMetadataUrl(id));

        if (response.status === 404) {
          if (!isCancelled) {
            setMetadata(null);
          }
          return;
        }

        if (!response.ok) {
          throw new Error(`Failed to load use case metadata (${response.status})`);
        }

        const data = (await response.json()) as UseCaseMetadata;

        if (!isCancelled) {
          setMetadata(data);
        }
      } catch (fetchError) {
        console.error("Failed to load use case metadata:", fetchError);

        if (!isCancelled) {
          setMetadata(null);
        }
      }
    }

    loadMetadata();

    return () => {
      isCancelled = true;
    };
  }, [id]);

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
        metadata,
      }
    : null;

  // Contract actions
  const actions = {
    depositRewards: async (amount: bigint) => {
      if (address === undefined) {
        throw new Error("Connect a wallet before depositing rewards");
      }

      if (publicClient === undefined) {
        throw new Error("Public client is not available");
      }

      const currentAllowance = await publicClient.readContract({
        address: TOKEN_ADDRESS,
        abi: TOKEN_ABI,
        functionName: "allowance",
        args: [address, USECASE_CONTRACT_ADDRESS],
      });

      if (currentAllowance < amount) {
        const approvalHash = await writeContractAsync({
          address: TOKEN_ADDRESS,
          abi: TOKEN_ABI,
          functionName: "approve",
          args: [USECASE_CONTRACT_ADDRESS, amount],
        });

        await waitForTransactionReceipt(config, { hash: approvalHash });
      }

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
