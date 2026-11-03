import crypto from "crypto";
import { ethers } from "ethers";
import { Permit } from "../../src/types/types";

export class IncentiveSigner {
  private readonly wallet: ethers.Wallet;

  constructor(
    privateKey: string,
    private readonly tokenAddress: string,
    provider: ethers.Provider
  ) {
    this.wallet = new ethers.Wallet(privateKey, provider);
  }

  /**
   * Creates a signed permit for token approval
   */
  private async createPermit(
    spender: string,
    value: string,
    deadline?: number
  ): Promise<Permit> {
    const owner = this.wallet.address;
    const provider = this.wallet.provider;

    if (!provider) {
      throw new Error("A provider is required to create an incentive permit");
    }

    const token = new ethers.Contract(
      this.tokenAddress,
      [
        "function nonces(address) view returns (uint256)",
        "function DOMAIN_SEPARATOR() view returns (bytes32)",
      ],
      provider
    );

    const currentBlock = await provider.getBlock("latest");
    if (!currentBlock) {
      throw new Error("Unable to read the latest block");
    }
    const currentBlockTimestamp = currentBlock.timestamp;

    const actualDeadline = deadline || currentBlockTimestamp + 7200;

    const nonce = await token.nonces(owner);

    const signature = await this.wallet.signTypedData(
      // Domain
      {
        name: "PTXToken",
        version: "1",
        chainId: (await provider.getNetwork()).chainId,
        verifyingContract: this.tokenAddress,
      },
      // Types
      {
        Permit: [
          { name: "owner", type: "address" },
          { name: "spender", type: "address" },
          { name: "value", type: "uint256" },
          { name: "nonce", type: "uint256" },
          { name: "deadline", type: "uint256" },
        ],
      },
      // Value
      {
        owner,
        spender,
        value: ethers.parseUnits(value, 18),
        nonce,
        deadline: actualDeadline,
      }
    );

    const { v, r, s } = ethers.Signature.from(signature);

    return {
      owner,
      spender,
      amount: ethers.parseUnits(value, 18).toString(),
      deadline: actualDeadline,
      v,
      r,
      s,
    };
  }

  /**
   * Creates a deposit request for use case rewards
   */
  async createUseCaseDepositRequest(
    useCaseId: string,
    useCaseAddress: string,
    amount: string,
    deadline?: number
  ) {
    const permit = await this.createPermit(useCaseAddress, amount, deadline);

    return {
      useCaseId,
      from: this.wallet.address,
      to: useCaseAddress,
      amount,
      permit,
    };
  }
}

/**
 * Returns the headers that authenticate a request body for the incentive API.
 * The body must be sent exactly as the string that was signed.
 */
export function signIncentiveApiRequest(rawBody: string, hmacSecret: string) {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signature = crypto.createHmac("sha256", hmacSecret).update(`${timestamp}.${rawBody}`).digest("hex");
  return {
    "Content-Type": "application/json",
    "X-DVCT-Timestamp": timestamp,
    "X-DVCT-Signature": signature,
  };
}
