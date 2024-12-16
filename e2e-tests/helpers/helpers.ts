import { ethers } from "ethers";

export async function waitForTx(
  promise: Promise<ethers.ContractTransactionResponse>
): Promise<ethers.TransactionReceipt> {
  const tx = await promise;
  const receipt = await tx.wait();
  if (!receipt) throw new Error("Transaction failed");
  return receipt;
}

export async function retryApiCall(
  fn: () => Promise<any>,
  maxRetries = 3,
  delay = 1000
): Promise<any> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}
