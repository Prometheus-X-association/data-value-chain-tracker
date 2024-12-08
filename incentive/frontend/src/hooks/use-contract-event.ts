import { UseWatchContractEventParameters, useWatchContractEvent } from "wagmi";
import { Log, createPublicClient, http } from "viem";
import { useState, useEffect } from "react";
import { hardhat } from "viem/chains";

type EventHandler<T> = (logs: T[]) => void;

export function useContractEvents<T = Log>(
  config: UseWatchContractEventParameters & {
    onLogs?: EventHandler<T>;
  },
) {
  const [data, setData] = useState<T[]>([]);
  const { address, abi, eventName, onLogs } = config;

  // Fetch historical events
  useEffect(() => {
    if (!address) return;

    const client = createPublicClient({
      chain: hardhat,
      transport: http(),
    });

    async function getHistoricalLogs() {
      const logs = await client.getLogs({
        address,
        event: (abi as any).find((x: any) => x.name === eventName),
        fromBlock: 0n,
        toBlock: "latest",
      });
      setData(logs as T[]);
    }

    getHistoricalLogs();
  }, [address, abi, eventName]);

  // Watch for new events
  useWatchContractEvent({
    address,
    abi,
    eventName,
    onLogs: (logs) => {
      setData((prev) => {
        const newData = [...prev, ...(logs as T[])];
        if (onLogs) {
          onLogs(newData);
        }
        return newData;
      });
    },
  });

  return { data };
}
