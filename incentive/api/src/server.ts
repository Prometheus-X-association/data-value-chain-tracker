import express from "express";
import { ethers } from "ethers";
import { createIncentiveRouter } from "./routes/IncentiveRoutes";
import { RawBodyRequest } from "./middleware/hmacAuth";

export interface ApiConfig {
  port: number;
  privateKey: string;
  useCaseAddress: string;
  tokenAddress: string;
  rpcUrl: string;
  hmacSecret: string;
}

export async function startServer(config: ApiConfig) {
  if (!config.hmacSecret || config.hmacSecret.length < 32) {
    throw new Error("INCENTIVE_API_HMAC_SECRET must be set to at least 32 characters");
  }
  if (!/^0x[0-9a-fA-F]{64}$/.test(config.privateKey || "")) {
    throw new Error("PRIVATE_KEY must be a 32-byte hex private key");
  }

  const app = express();
  app.disable("x-powered-by");
  // Keep the exact request bytes: the HMAC signature covers the raw body.
  app.use(
    express.json({
      limit: "64kb",
      verify: (req, _res, buf) => {
        (req as RawBodyRequest).rawBody = Buffer.from(buf);
      },
    })
  );

  const provider = new ethers.JsonRpcProvider(config.rpcUrl);
  const wallet = new ethers.Wallet(config.privateKey, provider);

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.use("/api/incentives", createIncentiveRouter(wallet, config.useCaseAddress, config.hmacSecret));

  app.use((_req: express.Request, res: express.Response) => {
    res.status(404).json({ success: false, error: "Not found" });
  });

  app.use(
    (
      err: Error & { type?: string },
      _req: express.Request,
      res: express.Response,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      _next: express.NextFunction
    ) => {
      if (err.type === "entity.parse.failed") {
        res.status(400).json({ success: false, error: "Malformed JSON body" });
        return;
      }
      console.error(err.stack);
      res.status(500).json({ success: false, error: "Internal server error" });
    }
  );

  const server = app.listen(config.port, () => {
    console.log(`Incentive API running on port ${config.port}, relayer ${wallet.address}`);
  });

  return server;
}
