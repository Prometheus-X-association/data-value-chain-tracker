import { ethers } from "ethers";
import {
  UseCaseContract,
  PTXToken,
} from "../../incentive/blockchain/typechain-types";
import { Server } from "http";
import { startServer } from "../../incentive/api/src/server";
import PTXTokenArtifact from "../../incentive/blockchain/artifacts/src/PTXToken.sol/PTXToken.json";
import UseCaseContractArtifact from "../../incentive/blockchain/artifacts/src/UseCaseContract.sol/UseCaseContract.json";

export interface TestEnvironment {
  apiServer: Server;
  useCase: UseCaseContract;
  token: PTXToken;
  apiUrl: string;
  contracts: {
    useCaseAddress: string;
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
  const apiSigner = new ethers.Wallet(
    "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a",
    provider
  );

  // Deploy PTX Token
  const PTXTokenFactory = new ethers.ContractFactory(
    PTXTokenArtifact.abi,
    PTXTokenArtifact.bytecode,
    owner
  );
  const token = (await PTXTokenFactory.deploy(
    ethers.parseEther("1000000")
  )) as PTXToken;
  await token.waitForDeployment();

  // Deploy UseCase Contract
  const UseCaseFactory = new ethers.ContractFactory(
    UseCaseContractArtifact.abi,
    UseCaseContractArtifact.bytecode,
    owner
  );
  const useCase = (await UseCaseFactory.deploy(
    await token.getAddress()
  )) as UseCaseContract;
  await useCase.waitForDeployment();

  const apiConfig = {
    port: 3001,
    privateKey: apiSigner.privateKey,
    useCaseAddress: await useCase.getAddress(),
    tokenAddress: await token.getAddress(),
    rpcUrl: "http://127.0.0.1:8545",
  };

  const apiServer = await startServer(apiConfig);

  return {
    apiServer,
    useCase,
    token,
    apiUrl: `http://localhost:${apiConfig.port}`,
    contracts: {
      useCaseAddress: await useCase.getAddress(),
      tokenAddress: await token.getAddress(),
    },
  };
}
