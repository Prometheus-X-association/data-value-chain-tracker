import { Router } from "express";
import { IncentiveController } from "../controllers/IncentiveController";
import { IncentiveService } from "../services/IncentiveService";
import { KeyManagementService } from "../services/KeyManagementService";
import { FileKeyStorage } from "../storage/FileKeyStorage";
import { ethers } from "ethers";

export function createIncentiveRouter(
  provider: ethers.Provider,
  wallet: ethers.Wallet,
  factoryAddress: string
): Router {
  const storage = new FileKeyStorage();
  const keyManager = new KeyManagementService(storage);
  const incentiveService = new IncentiveService(
    keyManager,
    provider,
    wallet,
    factoryAddress
  );

  const controller = new IncentiveController(incentiveService);

  const router = Router();

  router.post("/distribute", controller.distributeIncentive);

  return router;
}
