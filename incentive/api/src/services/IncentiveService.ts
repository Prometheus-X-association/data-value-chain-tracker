import { ethers } from "ethers";
import { UseCaseContract } from "../../../blockchain/typechain-types";
import { PTXToken } from "../../../blockchain/typechain-types";
import { TokenRewardRequest, UseCaseDepositRequest } from "../types/types";
import { TOKEN_ABI, USECASE_ABI } from "../contracts/abis";

export class IncentiveService {
  private token: PTXToken;
  private useCase: UseCaseContract;

  constructor(
    private wallet: ethers.Wallet,
    private useCaseAddress: string,
    private tokenAddress: string
  ) {
    this.useCase = new ethers.Contract(
      useCaseAddress,
      USECASE_ABI,
      wallet
    ) as unknown as UseCaseContract;

    this.token = new ethers.Contract(
      tokenAddress,
      TOKEN_ABI,
      wallet
    ) as unknown as PTXToken;
  }

  async transferReward(request: TokenRewardRequest): Promise<string> {
    if (!this.validateTransferRequest(request)) {
      throw new Error("Invalid transfer request");
    }

    const tx = await this.token.transferReward(
      request.from,
      request.to,
      ethers.parseEther(request.amount),
      ethers.id(request.incentiveType)
    );

    return tx.hash;
  }

  async transferRewardWithPermit(request: TokenRewardRequest): Promise<string> {
    if (!request.permit) {
      throw new Error("Permit required for this operation");
    }
    if (!this.validateTransferRequest(request)) {
      throw new Error("Invalid transfer request");
    }

    const tx = await this.token.transferRewardWithPermit(
      request.permit.owner,
      request.permit.spender,
      request.to,
      ethers.parseEther(request.amount),
      request.permit.deadline,
      request.permit.v,
      request.permit.r,
      request.permit.s,
      ethers.id(request.incentiveType)
    );

    return tx.hash;
  }

  async depositRewards(request: UseCaseDepositRequest): Promise<string> {
    if (!this.validateDepositRequest(request)) {
      throw new Error("Invalid deposit request");
    }

    const tx = await this.useCase.depositRewards(
      request.useCaseId,
      ethers.parseEther(request.amount)
    );

    return tx.hash;
  }

  async depositRewardsWithPermit(
    request: UseCaseDepositRequest
  ): Promise<string> {
    if (!request.permit) {
      throw new Error("Permit required for this operation");
    }
    if (!this.validateDepositRequest(request)) {
      throw new Error("Invalid deposit request");
    }

    const tx = await this.useCase.depositRewardsWithPermit(
      request.useCaseId,
      request.permit.owner,
      ethers.parseEther(request.amount),
      request.permit.deadline,
      request.permit.v,
      request.permit.r,
      request.permit.s
    );

    return tx.hash;
  }

  private validateTransferRequest(request: TokenRewardRequest): boolean {
    return (
      ethers.isAddress(request.from) &&
      ethers.isAddress(request.to) &&
      request.to !== ethers.ZeroAddress &&
      request.from !== ethers.ZeroAddress &&
      parseFloat(request.amount) > 0 &&
      !!request.incentiveType
    );
  }

  private validateDepositRequest(request: UseCaseDepositRequest): boolean {
    return (
      !!request.useCaseId &&
      request.useCaseId.length > 0 &&
      ethers.isAddress(request.from) &&
      ethers.isAddress(request.to) &&
      request.to !== ethers.ZeroAddress &&
      request.from !== ethers.ZeroAddress &&
      parseFloat(request.amount) > 0
    );
  }
}
