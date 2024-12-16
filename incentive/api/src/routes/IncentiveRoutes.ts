import { Router } from "express";
import { IncentiveController } from "../controllers/IncentiveController";
import { IncentiveService } from "../services/IncentiveService";
import { ethers } from "ethers";

export function createIncentiveRouter(
  wallet: ethers.Wallet,
  useCaseAddress: string,
  tokenAddress: string
): Router {
  const incentiveService = new IncentiveService(
    wallet,
    useCaseAddress,
    tokenAddress
  );

  const controller = new IncentiveController(incentiveService);
  const router = Router();

  // Single endpoint for all incentive distributions
  router.post("/distribute", controller.distributeIncentive);

  return router;
}
