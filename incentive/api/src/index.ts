import "dotenv/config";
import { startServer } from "./server";
import { TOKEN_ADDRESS, USECASE_CONTRACT_ADDRESS } from "./config/contracts";

startServer({
  port: parseInt(process.env.PORT || "3000", 10),
  privateKey: process.env.PRIVATE_KEY || "",
  rpcUrl: process.env.RPC_URL || "http://127.0.0.1:8545",
  hmacSecret: process.env.INCENTIVE_API_HMAC_SECRET || "",
  tokenAddress: TOKEN_ADDRESS,
  useCaseAddress: USECASE_CONTRACT_ADDRESS,
}).catch((error) => {
  console.error(`Startup failed: ${error.message}`);
  process.exit(1);
});

export { startServer };
