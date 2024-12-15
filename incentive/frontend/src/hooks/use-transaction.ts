import { useState } from "react";
import { useToast } from "./use-toast";
import { type Hash } from "viem";
import { waitForTransactionReceipt } from "@wagmi/core";
import { config } from "@/providers/web3";

interface TransactionState {
  isLoading: boolean;
  error: Error | null;
}

export function useTransaction() {
  const [state, setState] = useState<TransactionState>({
    isLoading: false,
    error: null,
  });
  const { toast } = useToast();

  const handleTransaction = async <T>(
    transaction: () => Promise<Hash>,
    {
      onSuccess,
      successMessage = "Transaction successful",
      errorMessage = "Transaction failed",
    }: {
      onSuccess?: (data: T) => void;
      successMessage?: string;
      errorMessage?: string;
    } = {},
  ) => {
    setState({ isLoading: true, error: null });

    // Show pending toast
    const pendingToast = toast({
      title: "Transaction Pending",
      description: "Please wait while your transaction is being processed...",
    });

    try {
      const hash = await transaction();
      const receipt = await waitForTransactionReceipt(config, { hash });

      // Remove pending toast
      pendingToast.update({
        id: pendingToast.id,
        title: "Transaction Successful",
        description: successMessage,
        variant: "default",
      });

      if (onSuccess) {
        onSuccess(receipt as T);
      }

      return receipt;
    } catch (error) {
      console.error("Transaction failed:", error);

      pendingToast.update({
        id: pendingToast.id,
        title: "Transaction Failed",
        description: errorMessage,
        variant: "destructive",
      });

      setState({ isLoading: false, error: error as Error });
      throw error;
    } finally {
      setState({ isLoading: false, error: null });
    }
  };

  return {
    ...state,
    handleTransaction,
  };
}
