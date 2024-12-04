import { Body, Post, Route } from "tsoa";
import { DistributeIncentiveRequest } from "../types/types";
import { IncentiveService } from "../services/incentive-service";

@Route("incentive")
export class DistributeIncentiveController {
  private incentiveService: IncentiveService;

  constructor() {
    this.incentiveService = new IncentiveService();
  }

  @Post("/distribute")
  public async distributeIncentive(
    @Body() requestBody: DistributeIncentiveRequest,
  ): Promise<{ message: string }> {
    await this.incentiveService.sendToQueue(requestBody);
    return {
      message: "Incentive distribution request sent to RabbitMQ successfully",
    };
  }
}
