import { UseWatchContractEventParameters, useWatchContractEvent } from "wagmi";
import { Log } from "viem";
import { Abi } from "viem";
import { useState, useEffect } from "react";

// Generic type for event handler
type EventHandler<T> = (logs: T[]) => void;

// Modified hook to return data
export function useContractEvents<T = Log>(
  config: UseWatchContractEventParameters & {
    onLogs?: EventHandler<T>;
  },
) {
  const [data, setData] = useState<T[] | undefined>(undefined);

  const { address, abi, eventName, onLogs, ...restConfig } = config;

  useWatchContractEvent({
    address,
    abi,
    eventName,
    onLogs: (logs) => {
      // Update local state with logs
      setData(logs as T[]);

      // Call optional onLogs handler
      if (onLogs) {
        onLogs(logs as T[]);
      }
    },
    ...restConfig,
  });

  return { data };
}
