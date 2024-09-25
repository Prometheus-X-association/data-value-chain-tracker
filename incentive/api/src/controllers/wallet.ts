import { Get, Route, Path } from "tsoa";
import fs from "fs/promises";
import path from "path";

interface WalletBalance {
  walletId: string;
  balance: number;
}

@Route("incentives/balance")
export class WalletBalanceController {
  @Get("{walletId}")
  public async getBalance(@Path() walletId: string): Promise<WalletBalance> {
    const data = await fs.readFile(
      path.join(__dirname, "../mock/wallets.json"),
      "utf8",
    );
    const wallets = JSON.parse(data);

    const wallet = wallets.find((w: WalletBalance) => w.walletId === walletId);

    if (!wallet) {
      throw new Error("Wallet not found");
    }

    return wallet;
  }
}
