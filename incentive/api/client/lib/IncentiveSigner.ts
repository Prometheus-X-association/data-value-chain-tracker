import { IncentivePayload, IncentiveRequest } from "api/src/types/types";
import crypto from "crypto";

export class IncentiveSigner {
  private privateKey: string;
  private clientId: string;
  private nonce: number;

  constructor(privateKey: string, clientId: string) {
    this.privateKey = privateKey;
    this.clientId = clientId;
    this.nonce = 0;
  }

  /**
   * Creates a signed incentive request
   */
  createSignedRequest(
    useCaseId: string,
    recipient: string,
    amount: string,
    eventName: string,
    factor: string
  ): IncentiveRequest {
    const payload: IncentivePayload = {
      useCaseId,
      recipient,
      amount,
      eventName,
      factor,
      nonce: this.nonce++,
      timestamp: Date.now(),
      clientId: this.clientId,
    };

    const signature = this.sign(payload);

    return {
      ...payload,
      signature,
    };
  }

  private sign(payload: IncentivePayload): string {
    // Create deterministic string representation
    const message = this.createMessage(payload);

    // Sign the message
    const signer = crypto.createSign("SHA256");
    signer.update(message);
    return signer.sign(this.privateKey, "base64");
  }

  private createMessage(payload: IncentivePayload): string {
    // Create deterministic string by sorting keys
    return JSON.stringify(payload, Object.keys(payload).sort());
  }
}
