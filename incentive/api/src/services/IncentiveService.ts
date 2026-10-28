import { ethers } from "ethers";
import { UseCaseDepositRequest } from "../types/types";
import { USECASE_ABI } from "../config/abis";

export class RequestError extends Error {}

/**
 * Relays permit-based reward deposits to the use case contract. The API wallet pays the gas and
 * holds RELAYER_ROLE on the contract; it can only move tokens that their owner signed a permit for.
 */
export class IncentiveService {
  private useCase: ethers.Contract;

  constructor(
    wallet: ethers.Wallet,
    private useCaseAddress: string
  ) {
    this.useCase = new ethers.Contract(useCaseAddress, USECASE_ABI, wallet);
  }

  async depositRewardsWithPermit(request: UseCaseDepositRequest): Promise<string> {
    const amount = ethers.parseEther(request.amount);
    const { permit } = request;

    if (ethers.getAddress(request.to) !== ethers.getAddress(this.useCaseAddress)) {
      throw new RequestError("Deposits must target the use case contract");
    }
    if (
      ethers.getAddress(permit.owner) !== ethers.getAddress(request.from) ||
      ethers.getAddress(permit.spender) !== ethers.getAddress(this.useCaseAddress) ||
      BigInt(permit.amount) !== amount
    ) {
      throw new RequestError("Permit does not match the deposit request");
    }

    const tx = await this.useCase.depositRewardsWithPermit(
      request.useCaseId,
      permit.owner,
      amount,
      permit.deadline,
      permit.v,
      permit.r,
      permit.s
    );

    return tx.hash;
  }
}
