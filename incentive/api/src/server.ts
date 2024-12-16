import express from "express";
import { ethers } from "ethers";
import { createIncentiveRouter } from "./routes/IncentiveRoutes";

export interface ApiConfig {
  port: number;
  privateKey: string;
  useCaseAddress: string;
  tokenAddress: string;
  rpcUrl: string;
}

export async function startServer(config: ApiConfig) {
  const app = express();
  app.use(express.json());

  // Initialize blockchain connection
  const provider = new ethers.JsonRpcProvider(config.rpcUrl);
  const wallet = new ethers.Wallet(config.privateKey, provider);

  const incentiveRouter = createIncentiveRouter(
    wallet,
    config.useCaseAddress,
    config.tokenAddress
  );

  app.use("/api/incentives", incentiveRouter);

  // Error handling middleware
  app.use(
    (
      err: Error,
      req: express.Request,
      res: express.Response,
      next: express.NextFunction
    ) => {
      console.error(err.stack);
      res.status(500).json({
        success: false,
        error: "Internal server error",
      });
    }
  );

  const server = app.listen(config.port, () => {
    console.log(`Server running on port ${config.port}`);
  });

  return server;
}
