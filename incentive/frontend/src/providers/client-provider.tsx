"use client";

import { TestWalletSwitcher } from "@/components/TestWalletSwitcher";
import { Web3Provider } from "@/providers/web3";
import { type ReactNode } from "react";

export function ClientProvider({ children }: { children: ReactNode }) {
  return (
    <Web3Provider>
      {children}
      {process.env.NEXT_PUBLIC_ENVIRONMENT === "development" && (
        <TestWalletSwitcher />
      )}
    </Web3Provider>
  );
}
