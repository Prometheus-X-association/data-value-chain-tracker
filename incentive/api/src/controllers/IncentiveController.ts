import { IncentiveService } from "@/services/IncentiveService";
import { IncentiveRequest } from "@/types/types";
import { Request, Response } from "express";

export class IncentiveController {
  constructor(private incentiveService: IncentiveService) {}

  public distributeIncentive = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const request = req.body as IncentiveRequest;

      // Basic request validation
      if (!this.validateRequestBody(request)) {
        res.status(400).json({
          success: false,
          error: "Invalid request body",
          details: "Missing or invalid required fields",
        });
        return;
      }

      let txHash: string;

      // Determine which type of request it is and call appropriate service method
      if ("useCaseId" in request) {
        // This is a UseCase deposit request
        if (request.permit) {
          txHash =
            await this.incentiveService.depositRewardsWithPermit(request);
        } else {
          txHash = await this.incentiveService.depositRewards(request);
        }
      } else if ("incentiveType" in request) {
        // This is a token reward request
        if (request.permit) {
          txHash =
            await this.incentiveService.transferRewardWithPermit(request);
        } else {
          txHash = await this.incentiveService.transferReward(request);
        }
      } else {
        throw new Error("Invalid request type");
      }

      res.status(200).json({
        success: true,
        data: {
          transactionHash: txHash,
          ...request,
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

  private validateRequestBody(request: IncentiveRequest): boolean {
    // Common validations
    if (!request.from || !request.to || !request.amount) {
      return false;
    }

    // Specific validations based on request type
    if ("useCaseId" in request) {
      return !!request.useCaseId;
    }

    if ("incentiveType" in request) {
      return !!request.incentiveType;
    }

    return false;
  }

  private getErrorStatusCode(error: string): number {
    if (error.includes("Invalid request")) return 400;
    if (error.includes("Not authorized")) return 403;
    if (error.includes("Not found")) return 404;
    return 500;
  }
}
