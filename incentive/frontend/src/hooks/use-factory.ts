import { useReadContract, useReadContracts } from "wagmi";
import { FACTORY_ADDRESS, FACTORY_ABI, USECASE_ABI } from "@/config/contracts";
import { mapUseCasesData } from "@/lib/use-case";

export function useFactoryContract() {
  // Get total number of use cases
  const { data: totalUseCases } = useReadContract({
    address: FACTORY_ADDRESS,
    abi: FACTORY_ABI,
    functionName: "nextUseCaseId",
  });

  // Get all use case addresses
  const { data: useCaseAddresses } = useReadContracts({
    contracts: Array.from({ length: Number(totalUseCases ?? 0) }).map(
      (_, i) => ({
        address: FACTORY_ADDRESS,
        abi: FACTORY_ABI,
        functionName: "useCaseContracts",
        args: [BigInt(i)],
      }),
    ),
  });

  // Get data for all use cases
  const { data: useCasesData } = useReadContracts({
    contracts:
      useCaseAddresses
        ?.map((result) => [
          {
            address: result.result as `0x${string}`,
            abi: USECASE_ABI,
            functionName: "getUseCaseStats",
          },
          {
            address: result.result as `0x${string}`,
            abi: USECASE_ABI,
            functionName: "getSupportedEvents",
          },
          {
            address: result.result as `0x${string}`,
            abi: USECASE_ABI,
            functionName: "owner",
          },
        ])
        .flat() ?? [],
  });

  // Format use cases
  const useCases = mapUseCasesData(useCasesData);

  return { useCases };
}
