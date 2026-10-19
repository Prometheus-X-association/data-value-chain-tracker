import { Router } from "express";
import { ethers } from "ethers";
import { IncentiveController } from "../controllers/IncentiveController";
import { IncentiveService } from "../services/IncentiveService";
import { createHmacAuth } from "../middleware/hmacAuth";

export function createIncentiveRouter(
  wallet: ethers.Wallet,
  useCaseAddress: string,
  hmacSecret: string
): Router {
  const controller = new IncentiveController(new IncentiveService(wallet, useCaseAddress));
  const router = Router();

  // Relays a permit-based reward deposit into a use case. Callers must sign the request.
  router.post("/distribute", createHmacAuth(hmacSecret), controller.distributeIncentive);

  return router;
}
