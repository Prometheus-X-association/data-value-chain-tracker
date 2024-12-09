import { startServer } from "./server";

if (require.main === module) {
  startServer({
    port: parseInt(process.env.PORT || "3000"),
    privateKey: process.env.PRIVATE_KEY!,
    factoryAddress: process.env.CONTRACT_ADDRESS!,
    tokenAddress: process.env.TOKEN_ADDRESS!,
    rpcUrl: process.env.RPC_URL!,
  }).catch(console.error);
}

export { startServer };
