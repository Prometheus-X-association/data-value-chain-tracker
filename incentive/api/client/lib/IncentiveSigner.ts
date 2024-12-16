import { ethers } from "ethers";
import { Permit } from "../../src/types/types";

export class IncentiveSigner {
  private wallet: ethers.Wallet;

  constructor(
    privateKey: string,
    private tokenAddress: string,
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
    const token = new ethers.Contract(
      this.tokenAddress,
      [
        "function nonces(address) view returns (uint256)",
        "function DOMAIN_SEPARATOR() view returns (bytes32)",
      ],
      this.wallet.provider!
    );

    const currentBlockTimestamp = (await this.wallet.provider!.getBlock(
      "latest"
    ))!.timestamp;

    const actualDeadline = deadline || currentBlockTimestamp + 7200;

    const nonce = await token.nonces(owner);

    const signature = await this.wallet.signTypedData(
      // Domain
      {
        name: "PTXToken",
        version: "1",
        chainId: (await this.wallet.provider!.getNetwork()).chainId,
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

  /**
   * Creates a direct token reward request
   */
  async createTokenRewardRequest(
    to: string,
    amount: string,
    incentiveType: string,
    deadline?: number
  ) {
    const permit = await this.createPermit(to, amount, deadline);

    return {
      from: this.wallet.address,
      to,
      amount,
      incentiveType,
      permit,
    };
  }
}
