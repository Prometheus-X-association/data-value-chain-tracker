import "dotenv/config";
import { startServer } from "./server";
import { TOKEN_ADDRESS, USECASE_CONTRACT_ADDRESS } from "./config/contracts";

startServer({
  port: parseInt(process.env.PORT || "3000"),
  privateKey: process.env.PRIVATE_KEY!,
  rpcUrl: process.env.RPC_URL!,
  tokenAddress: TOKEN_ADDRESS,
  useCaseAddress: USECASE_CONTRACT_ADDRESS,
}).catch(console.error);

export { startServer };
