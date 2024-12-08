import { KeyManagementService } from "./KeyManagementService";
import {
  IncentivePermission,
  IncentiveRequest,
  IncentivePayload,
} from "../types/types";
import crypto from "crypto";
import { ethers } from "ethers";
import { FACTORY_ABI, USECASE_ABI } from "../contracts/abis";
import {
  UseCaseFactory,
  UseCaseContract,
} from "../../../blockchain/typechain-types";

export class IncentiveService {
  private factory: UseCaseFactory;

  constructor(
    private keyManager: KeyManagementService,
    private provider: ethers.Provider,
    private wallet: ethers.Wallet,
    private factoryAddress: string
  ) {
    this.factory = new ethers.Contract(
      factoryAddress,
      FACTORY_ABI,
      wallet
    ) as unknown as UseCaseFactory;
  }

  async distributeIncentive(request: IncentiveRequest): Promise<string> {
    // 1. Validate request
    await this.validateRequest(request);

    // 2. Verify signature
    await this.verifySignature(request);

    // 3. Submit transaction
    return this.submitTransaction(request);
  }

  private async validateRequest(request: IncentiveRequest): Promise<void> {
    // Check if client has permission
    const hasPermission = await this.keyManager.validatePermission(
      request.clientId,
      IncentivePermission.DISTRIBUTE
    );

    if (!hasPermission) {
      throw new Error(
        "Client does not have permission to distribute incentives"
      );
    }

    // Validate timestamp (e.g., not too old)
    const MAX_AGE = 5 * 60 * 1000; // 5 minutes
    if (Date.now() - request.timestamp > MAX_AGE) {
      throw new Error("Request has expired");
    }

    // Additional validations as needed
    if (!ethers.isAddress(request.recipient)) {
      throw new Error("Invalid recipient address");
    }

    try {
      ethers.parseUnits(request.amount, 18); // Assuming 18 decimals
    } catch {
      throw new Error("Invalid amount");
    }
  }

  private async verifySignature(request: IncentiveRequest): Promise<void> {
    const { signature, ...payload } = request;

    // Get public key
    const publicKey = await this.keyManager.getPublicKey(request.clientId);
    if (!publicKey) {
      throw new Error("Public key not found");
    }

    // Create message
    const message = JSON.stringify(payload, Object.keys(payload).sort());

    // Verify signature
    const verifier = crypto.createVerify("SHA256");
    verifier.update(message);

    const isValid = verifier.verify(publicKey, signature, "base64");
    if (!isValid) {
      throw new Error("Invalid signature");
    }
  }

  private async submitTransaction(request: IncentiveRequest): Promise<string> {
    const useCaseAddress = await this.factory.useCaseContracts(
      BigInt(request.useCaseId)
    );
    if (useCaseAddress === ethers.ZeroAddress) {
      throw new Error("Invalid use case ID");
    }

    const useCase = new ethers.Contract(
      useCaseAddress,
      [
        "function notifyEvent(string memory eventName, address participant, uint256 factor)",
      ],
      this.wallet
    ) as unknown as UseCaseContract;

    const tx = await useCase.notifyEvent(
      request.eventName,
      request.recipient,
      ethers.parseUnits(request.factor, 18)
    );

    await tx.wait();

    return tx.hash;
  }
}
