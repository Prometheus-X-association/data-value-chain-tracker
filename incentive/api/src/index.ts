import express from "express";
import { ethers } from "ethers";
import { createIncentiveRouter } from "./routes/IncentiveRoutes";

async function startServer() {
  const app = express();

  app.use(express.json());

  // Initialize blockchain connection
  const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);
  const contractAddress = process.env.CONTRACT_ADDRESS!;

  const incentiveRouter = createIncentiveRouter(
    provider,
    wallet,
    contractAddress
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

  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
}

startServer().catch(console.error);
