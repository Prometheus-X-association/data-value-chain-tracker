import { describe, it, before, after } from "mocha";
import { expect } from "chai";
import { ethers } from "ethers";
import axios from "axios";
import { setupTestEnvironment, TestEnvironment } from "./setup";
import { UseCaseContract } from "../../incentive/blockchain/typechain-types";
import UseCaseContractArtifact from "../../incentive/blockchain/artifacts/src/UseCaseContract.sol/UseCaseContract.json";
import { IncentiveSigner } from "../../incentive/api/client/lib/IncentiveSigner";
import { KeyManagementService } from "../../incentive/api/src/services/KeyManagementService";
import { FileKeyStorage } from "../../incentive/api/src/storage/FileKeyStorage";
import { IncentivePermission } from "../../incentive/api/src/types/types";

describe("Scenario 1: Full cycle from use case creation to reward claim", function () {
  this.timeout(30000); // Set timeout to 30 seconds

  let env: TestEnvironment;
  let provider: ethers.JsonRpcProvider;
  let orchestrator: ethers.Wallet;
  let participant: ethers.Wallet;
  let keyManagement: KeyManagementService;
  let apiClientId: string = "test-client";
  let apiPrivateKey: string;
  let apiPublicKey: string;

  before(async () => {
    provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
    orchestrator = new ethers.Wallet(
      "0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a",
      provider
    );
    participant = new ethers.Wallet(
      "0x8b3a350cf5c34c9194ca85829a2df0ec3153be0318b5e2d3348e872092edffba",
      provider
    );
    env = await setupTestEnvironment();

    // Setup key management and register client
    keyManagement = new KeyManagementService(new FileKeyStorage());
    const { privateKey, publicKey } = await keyManagement.generateKeyPair(
      apiClientId,
      [IncentivePermission.DISTRIBUTE]
    );
    apiPrivateKey = privateKey;
    apiPublicKey = publicKey;
  });

  after(async () => {
    if (env?.apiServer) {
      await env.apiServer.close();
    }
  });

  it("should complete full cycle from use case creation to reward claim", async () => {
    // 1. Create use case through blockchain
    const eventNames = ["data_provider"];
    const baseRewards = [ethers.parseEther("100")];
    const rewardPool = ethers.parseEther("1000");

    // Transfer and approve tokens for orchestrator with wait
    const transferTx = await env.token.transfer(
      orchestrator.address,
      ethers.parseEther("2000")
    );
    await transferTx.wait();

    const approveTx = await env.token
      .connect(orchestrator)
      .approve(env.contracts.factoryAddress, rewardPool);
    await approveTx.wait();

    // Create use case with wait
    const tx = await env.factory.connect(orchestrator).createUseCase(
      24 * 60 * 60, // 1 day lock
      eventNames,
      baseRewards,
      rewardPool
    );
    const receipt = await tx.wait();

    // Get use case ID from event
    const event = receipt?.logs.find(
      (log) =>
        env.factory.interface.parseLog(log as any)?.name === "UseCaseCreated"
    );
    const useCaseId = env.factory.interface.parseLog(event as any)?.args[0];

    // Create signer with registered client
    const signer = new IncentiveSigner(apiPrivateKey, apiClientId);

    // Create signed request
    const signedRequest = signer.createSignedRequest(
      useCaseId.toString(),
      participant.address,
      baseRewards[0].toString(),
      "data_provider",
      "0.8"
    );

    const response = await axios.post(
      `${env.apiUrl}/api/incentives/distribute`,
      signedRequest
    );

    expect(response.status).to.equal(200);

    // 3. Wait for lock duration and claim rewards
    await provider.send("evm_increaseTime", [25 * 60 * 60]); // 25 hours
    await provider.send("evm_mine", []);

    const useCaseAddress = await env.factory.useCaseContracts(useCaseId);
    const UseCaseContract = new ethers.ContractFactory(
      UseCaseContractArtifact.abi,
      UseCaseContractArtifact.bytecode,
      participant
    );
    const useCase = UseCaseContract.attach(useCaseAddress) as UseCaseContract;

    await useCase.connect(participant).claimRewards();

    // 4. Verify participant received tokens
    const balance = await env.token.balanceOf(participant.address);
    const expectedReward = (baseRewards[0] * 8n) / 10n; // 80% of base reward
    expect(balance).to.equal(expectedReward);
  });
});
