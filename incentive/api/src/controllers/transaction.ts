import { Get, Route, Path, Query } from "tsoa";
import fs from "fs/promises";
import path from "path";

interface Transaction {
  transactionId: string;
  fromWalletId: string;
  toWalletId: string;
  points: number;
  timestamp: string;
  contractId: string;
  dataUsageId: string;
}

@Route("incentives/history")
export class TransactionHistoryController {
  @Get("{walletId}")
  public async getHistory(
    @Path() walletId: string,
    @Query() startDate?: string,
    @Query() endDate?: string,
  ): Promise<Transaction[]> {
    const data = await fs.readFile(
      path.join(__dirname, "../mock/transactions.json"),
      "utf8",
    );
    const transactions = JSON.parse(data);

    let filteredTransactions = transactions.filter(
      (t: Transaction) =>
        t.fromWalletId === walletId || t.toWalletId === walletId,
    );

    if (startDate) {
      filteredTransactions = filteredTransactions.filter(
        (t: Transaction) => new Date(t.timestamp) >= new Date(startDate),
      );
    }

    if (endDate) {
      filteredTransactions = filteredTransactions.filter(
        (t: Transaction) => new Date(t.timestamp) <= new Date(endDate),
      );
    }

    if (filteredTransactions.length === 0) {
      throw new Error("No transactions found for this wallet");
    }

    return filteredTransactions;
  }
}
