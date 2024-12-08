import { Request, Response } from "express";
import { IncentiveService } from "../services/IncentiveService";
import { IncentiveRequest } from "../types/types";

export class IncentiveController {
  constructor(private incentiveService: IncentiveService) {}

  /**
   * Handles incentive distribution requests by notifying events to the use case contract
   */
  public distributeIncentive = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const request: IncentiveRequest = req.body;

      // Basic request validation
      if (!this.validateRequestBody(request)) {
        res.status(400).json({
          success: false,
          error: "Invalid request body",
          details: "Missing or invalid required fields",
        });
        return;
      }

      // Process the event notification
      const txHash = await this.incentiveService.distributeIncentive(request);

      res.status(200).json({
        success: true,
        data: {
          transactionHash: txHash,
          useCaseId: request.useCaseId,
          eventName: request.eventName,
          recipient: request.recipient,
          factor: request.factor,
        },
      });
    } catch (error) {
      console.error("Incentive distribution error:", error);

      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      const statusCode = this.getErrorStatusCode(errorMessage);

      res.status(statusCode).json({
        success: false,
        error: errorMessage,
      });
    }
  };

  private validateRequestBody(request: any): request is IncentiveRequest {
    return (
      request &&
      typeof request.clientId === "string" &&
      typeof request.useCaseId === "string" &&
      typeof request.recipient === "string" &&
      typeof request.eventName === "string" &&
      typeof request.factor === "string" &&
      typeof request.nonce === "number" &&
      typeof request.timestamp === "number" &&
      typeof request.signature === "string" &&
      // Additional validation for factor format
      !isNaN(parseFloat(request.factor)) &&
      parseFloat(request.factor) >= 0 &&
      parseFloat(request.factor) <= 1
    );
  }

  private getErrorStatusCode(error: string): number {
    if (error.includes("Invalid signature")) return 401;
    if (error.includes("does not have permission")) return 403;
    if (error.includes("Invalid request")) return 400;
    if (error.includes("Request has expired")) return 400;
    if (error.includes("Invalid use case ID")) return 404;
    if (error.includes("Invalid factor")) return 400;
    if (error.includes("Invalid recipient address")) return 400;
    return 500;
  }
}
