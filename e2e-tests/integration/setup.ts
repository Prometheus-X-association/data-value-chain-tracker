import { ethers } from "ethers";
import {
  UseCaseContract,
  PTXToken,
} from "../../incentive/blockchain/typechain-types";
import { Server } from "http";
import fs from "fs";
import path from "path";
import { startServer } from "../../incentive/api/src/server";
import PTXTokenArtifact from "../../incentive/blockchain/artifacts/src/PTXToken.sol/PTXToken.json";
import UseCaseContractArtifact from "../../incentive/blockchain/artifacts/src/UseCaseContract.sol/UseCaseContract.json";

export interface TestEnvironment {
  apiServer: Server | null;
  useCase: UseCaseContract;
  token: PTXToken;
  apiUrl: string;
  contracts: {
    useCaseAddress: string;
    tokenAddress: string;
  };
}

export async function setupTestEnvironment(): Promise<TestEnvironment> {
  const rpcUrl = process.env.INCENTIVE_RPC_URL || "http://127.0.0.1:8545";
  const apiPort = parseInt(process.env.INCENTIVE_API_PORT || "3001", 10);
  const externalApiUrl = process.env.INCENTIVE_API_URL;

  // Setup provider and wallet
  const provider = new ethers.JsonRpcProvider(rpcUrl);

  if (externalApiUrl) {
    const deploymentPath = path.join(
      process.cwd(),
      "incentive/api/src/config/deployment.json"
    );
    const deploymentInfo = JSON.parse(
      fs.readFileSync(deploymentPath, "utf-8")
    ) as {
      PTX_TOKEN_ADDRESS: string;
      USECASE_CONTRACT_ADDRESS: string;
    };

    const owner = new ethers.Wallet(
      "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
      provider
    );

    const token = new ethers.Contract(
      deploymentInfo.PTX_TOKEN_ADDRESS,
      PTXTokenArtifact.abi,
      owner
    ) as unknown as PTXToken;

    const useCase = new ethers.Contract(
      deploymentInfo.USECASE_CONTRACT_ADDRESS,
      UseCaseContractArtifact.abi,
      owner
    ) as unknown as UseCaseContract;

    return {
      apiServer: null,
      useCase,
      token,
      apiUrl: externalApiUrl,
      contracts: {
        useCaseAddress: deploymentInfo.USECASE_CONTRACT_ADDRESS,
        tokenAddress: deploymentInfo.PTX_TOKEN_ADDRESS,
      },
    };
  }

  await provider.send("hardhat_reset", []);

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
    port: apiPort,
    privateKey: apiSigner.privateKey,
    useCaseAddress: await useCase.getAddress(),
    tokenAddress: await token.getAddress(),
    rpcUrl,
  };

  const apiServer = await startServer(apiConfig);

  return {
    apiServer,
    useCase,
    token,
    apiUrl: `http://127.0.0.1:${apiConfig.port}`,
    contracts: {
      useCaseAddress: await useCase.getAddress(),
      tokenAddress: await token.getAddress(),
    },
  };
}
