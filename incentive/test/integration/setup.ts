import { ethers } from "ethers";
import { UseCaseFactory, PTXToken } from "../../blockchain/typechain-types";
import { Server } from "http";
import { startServer } from "../../api/src/server";
import PTXTokenArtifact from "../../blockchain/artifacts/src/PTXToken.sol/PTXToken.json";
import UseCaseFactoryArtifact from "../../blockchain/artifacts/src/UseCaseFactory.sol/UseCaseFactory.json";

export interface TestEnvironment {
  apiServer: Server;
  factory: UseCaseFactory;
  token: PTXToken;
  apiUrl: string;
  contracts: {
    factoryAddress: string;
    tokenAddress: string;
  };
}

export async function setupTestEnvironment(): Promise<TestEnvironment> {
  // Setup provider and wallet
  const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");

  // Create wallets for different roles
  const owner = new ethers.Wallet(
    "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
    provider
  );
  const operator = new ethers.Wallet(
    "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d",
    provider
  );
  const apiSigner = new ethers.Wallet(
    "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a",
    provider
  );

  // Deploy PTX Token with await for transaction confirmation
  const PTXTokenFactory = new ethers.ContractFactory(
    PTXTokenArtifact.abi,
    PTXTokenArtifact.bytecode,
    owner
  );
  const token = (await PTXTokenFactory.deploy(
    ethers.parseEther("1000000")
  )) as PTXToken;
  await token.waitForDeployment();

  // Deploy Factory with await for transaction confirmation
  const Factory = new ethers.ContractFactory(
    UseCaseFactoryArtifact.abi,
    UseCaseFactoryArtifact.bytecode,
    owner
  );
  const factory = (await Factory.deploy(
    await token.getAddress()
  )) as UseCaseFactory;
  await factory.waitForDeployment();

  // Setup roles with await for transaction confirmations
  const addOperatorTx = await factory.addOperator(operator.address);
  await addOperatorTx.wait();

  const addNotifierTx = await factory
    .connect(operator)
    .addGlobalNotifier(apiSigner.address);
  await addNotifierTx.wait();

  const apiConfig = {
    port: 3001,
    privateKey: apiSigner.privateKey,
    factoryAddress: await factory.getAddress(),
    tokenAddress: await token.getAddress(),
    rpcUrl: "http://127.0.0.1:8545",
  };

  const apiServer = await startServer(apiConfig);

  return {
    apiServer,
    factory,
    token,
    apiUrl: `http://localhost:${apiConfig.port}`,
    contracts: {
      factoryAddress: await factory.getAddress(),
      tokenAddress: await token.getAddress(),
    },
  };
}
