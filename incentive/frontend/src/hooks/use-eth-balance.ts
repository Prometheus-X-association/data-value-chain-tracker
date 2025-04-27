import { useAccount, useBalance } from "wagmi";

export function useEthBalance() {
  const { address } = useAccount();

  const { data: balance, refetch: refetchBalance } = useBalance({
    address,
  });

  return {
    balance: balance?.value,
    refetch: refetchBalance,
  };
}
