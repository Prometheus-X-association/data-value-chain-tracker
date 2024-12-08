import { useAccount, useReadContract } from "wagmi";
import { TOKEN_ABI, TOKEN_ADDRESS, USECASE_ABI } from "@/config/contracts";

export function usePtxToken() {
  const { address } = useAccount();

  // Get user's PTX balance
  const { data: balance } = useReadContract({
    address: TOKEN_ADDRESS,
    abi: TOKEN_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
  });

  return {
    balance,
  };
}
