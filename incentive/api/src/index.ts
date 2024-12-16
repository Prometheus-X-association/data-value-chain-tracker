import { startServer } from "./server";

if (require.main === module) {
  startServer({
    port: parseInt(process.env.PORT || "3000"),
    privateKey: process.env.PRIVATE_KEY!,
    tokenAddress: process.env.TOKEN_ADDRESS!,
    rpcUrl: process.env.RPC_URL!,
    useCaseAddress: process.env.USE_CASE_ADDRESS!,
  }).catch(console.error);
}

export { startServer };
