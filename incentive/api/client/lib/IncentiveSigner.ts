import { ethers } from "ethers";
import { PermitSignature } from "../../src/types/types";

export class IncentiveSigner {
  private wallet: ethers.Wallet;
  private token: ethers.Contract;
  private apiWalletAddress: string;
  private useCaseContractAddress?: string;

  constructor(
    privateKey: string,
    tokenAddress: string,
    apiWalletAddress: string,
    provider: ethers.Provider,
    useCaseContractAddress?: string
  ) {
    this.wallet = new ethers.Wallet(privateKey, provider);
    this.apiWalletAddress = apiWalletAddress;
    this.useCaseContractAddress = useCaseContractAddress;

    this.token = new ethers.Contract(
      tokenAddress,
      [
        "function DOMAIN_SEPARATOR() view returns (bytes32)",
        "function nonces(address owner) view returns (uint256)",
        "function PERMIT_TYPEHASH() view returns (bytes32)",
      ],
      provider
    );
  }

  /**
   * Creates a signed permit for token approval
   */
  private async createPermit(
    isUseCaseDeposit: boolean,
    value: string,
    deadline: number = Math.floor(Date.now() / 1000) + 3600 // 1 hour from now
  ): Promise<PermitSignature> {
    const owner = this.wallet.address;
    const spender = isUseCaseDeposit
      ? this.useCaseContractAddress!
      : this.apiWalletAddress;

    const nonce = await this.token.nonces(owner);

    // Permit type data according to EIP-2612
    const permitData = {
      owner,
      spender,
      value: ethers.parseUnits(value, 18),
      nonce,
      deadline,
    };

    // Create permit signature
    const signature = await this.wallet.signTypedData(
      // Domain
      {
        name: "PTX Token",
        version: "1",
        chainId: (await this.wallet.provider!.getNetwork()).chainId!,
        verifyingContract: await this.token.getAddress(),
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
      permitData
    );

    const { v, r, s } = ethers.Signature.from(signature);

    return {
      v,
      r,
      s,
      deadline,
      value: permitData.value.toString(),
    };
  }

  /**
   * Creates a deposit request for use case rewards
   */
  async createUseCaseDepositRequest(
    useCaseId: string,
    amount: string,
    deadline?: number
  ) {
    if (!this.useCaseContractAddress) {
      throw new Error("Use case contract address not configured");
    }

    const permit = await this.createPermit(true, amount, deadline);

    return {
      useCaseId,
      owner: this.wallet.address,
      amount: permit.value,
      deadline: permit.deadline,
      v: permit.v,
      r: permit.r,
      s: permit.s,
    };
  }

  /**
   * Creates a direct token reward transfer request
   */
  async createTokenRewardRequest(
    amount: string,
    incentiveType: string,
    deadline?: number
  ) {
    const permit = await this.createPermit(false, amount, deadline);

    return {
      owner: this.wallet.address,
      amount: permit.value,
      incentiveType,
      deadline: permit.deadline,
      v: permit.v,
      r: permit.r,
      s: permit.s,
    };
  }
}
