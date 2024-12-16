import { useEffect, useState } from 'react';
import { usePublicClient } from 'wagmi';

export function useBlockTime() {
  const [blockTime, setBlockTime] = useState<bigint>(0n);
  const publicClient = usePublicClient();

  useEffect(() => {
    if (!publicClient) return;

    const getBlockTime = async () => {
      const block = await publicClient.getBlock();
      setBlockTime(BigInt(block.timestamp));
    };

    getBlockTime();
    const interval = setInterval(getBlockTime, 1000);
    return () => clearInterval(interval);
  }, [publicClient]);

  return blockTime;
}