import { Request, Response } from "express";
import { IncentiveService } from "../services/IncentiveService";
import { IncentiveRequest } from "../types/types";

export class IncentiveController {
  constructor(private incentiveService: IncentiveService) {}

  /**
   * Handles incentive distribution requests
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
        });
        return;
      }

      // Process the distribution
      const txHash = await this.incentiveService.distributeIncentive(request);

      res.status(200).json({
        success: true,
        data: {
          transactionHash: txHash,
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
      typeof request.recipient === "string" &&
      typeof request.amount === "string" &&
      typeof request.nonce === "number" &&
      typeof request.timestamp === "number" &&
      typeof request.signature === "string"
    );
  }

  private getErrorStatusCode(error: string): number {
    if (error.includes("Invalid signature")) return 401;
    if (error.includes("does not have permission")) return 403;
    if (error.includes("Invalid request")) return 400;
    if (error.includes("Request has expired")) return 400;
    return 500;
  }
}
