import { describe, it, before, after } from "mocha";
import { expect } from "chai";
import { ethers } from "ethers";
import { setupTestEnvironment, TestEnvironment } from "./setup";
import { IncentiveSigner } from "../../incentive/api/client/lib/IncentiveSigner";
import { waitForTx } from "../helpers/helpers";
import axios from "axios";

describe("Scenario 2: Corporate Training with Multiple AI/Service Providers", function () {
  this.timeout(60000);

  let env: TestEnvironment;
  let provider: ethers.JsonRpcProvider;
  let dataProvider: ethers.Wallet;
  let aiProvider1: ethers.Wallet;
  let aiProvider2: ethers.Wallet;
  let serviceProvider: ethers.Wallet;
  let orchestrator: ethers.Wallet;
  let incentiveSigner: IncentiveSigner;

  const LOCK_DURATION = 24 * 60 * 60; // 1 day lock
  const REWARD_POOL = ethers.parseEther("100"); // 100 PTX tokens for this scenario
  const DATA_PROVIDER_SHARE = 3000; // 30%
  const AI_PROVIDER1_SHARE = 2000; // 20%
  const AI_PROVIDER2_SHARE = 2000; // 20%
  const SERVICE_PROVIDER_SHARE = 1500; // 15%
  const ORCHESTRATOR_SHARE = 1500; // 15%
  const USE_CASE_ID = "corporate-training-multi-provider";

  let orchestratorInitialBalance: bigint;
  let orchestratorDepositAmount: bigint;

  before(async () => {
    // Setup provider and wallets
    provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");

    // Initialize wallets with test private keys
    dataProvider = new ethers.Wallet(
      "0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a",
      provider
    );
    aiProvider1 = new ethers.Wallet(
      "0x8b3a350cf5c34c9194ca85829a2df0ec3153be0318b5e2d3348e872092edffba",
      provider
    );
    aiProvider2 = new ethers.Wallet(
      "0x92db14e403b83dfe3df233f83dfa3a0d7096f21ca9b0d6d6b8d88b2b4ec1564e",
      provider
    );
    serviceProvider = new ethers.Wallet(
      "0x4bbbf85ce3377467afe5d46f804f221813b2bb87f24d81f60f1fcdbf7cbf4356",
      provider
    );
    orchestrator = new ethers.Wallet(
      "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
      provider
    );

    env = await setupTestEnvironment();

    // Initialize IncentiveSigner with orchestrator as reward depositor
    incentiveSigner = new IncentiveSigner(
      orchestrator.privateKey,
      await env.token.getAddress(),
      provider
    );

    // Transfer initial tokens to orchestrator
    await waitForTx(
      env.token.transfer(orchestrator.address, ethers.parseEther("1000"))
    );

    // Store initial balance
    orchestratorInitialBalance = await env.token.balanceOf(
      orchestrator.address
    );

    // Store deposit amount for later calculations
    orchestratorDepositAmount = REWARD_POOL;
  });

  after(async () => {
    if (env?.apiServer) {
      await env.apiServer.close();
    }
  });

  it("should complete full cycle of corporate training scenario with multiple providers", async () => {
    // 1. Orchestrator creates the use case
    await waitForTx(
      env.useCase.connect(orchestrator).createUseCase(USE_CASE_ID)
    );

    // 2. Set up participant shares
    const participants = [
      dataProvider.address,
      aiProvider1.address,
      aiProvider2.address,
      serviceProvider.address,
      orchestrator.address,
    ];
    const shares = [
      DATA_PROVIDER_SHARE,
      AI_PROVIDER1_SHARE,
      AI_PROVIDER2_SHARE,
      SERVICE_PROVIDER_SHARE,
      ORCHESTRATOR_SHARE,
    ];
    await waitForTx(
      env.useCase
        .connect(orchestrator)
        .updateRewardShares(USE_CASE_ID, participants, shares)
    );

    // 3. Create signed request for reward distribution
    const signedRequest = await incentiveSigner.createUseCaseDepositRequest(
      USE_CASE_ID,
      env.contracts.useCaseAddress,
      ethers.formatEther(REWARD_POOL)
    );

    // 4. Send request to incentive API
    const response = await axios.post(
      `${env.apiUrl}/api/incentives/distribute`,
      signedRequest
    );
    expect(response.status).to.equal(200);

    const txHash = (response.data as { data: { transactionHash: string } }).data.transactionHash;

    // ✅ Wait until the tx is mined AND confirmed
    const receipt = await provider.waitForTransaction(txHash, 1); // wait for 1 confirmation
    expect(receipt?.status).to.equal(1); // ensure it was successful

    // Add explicit wait for transaction confirmation
    await provider.send("evm_mine", []); // Mine a new block
    await provider.send("evm_mine", []); // Mine another block for good measure

    // 5. Lock the rewards
    await waitForTx(
      env.useCase.connect(orchestrator).lockRewards(USE_CASE_ID, LOCK_DURATION)
    );

    // 6. Wait for lock duration to pass
    await provider.send("evm_increaseTime", [LOCK_DURATION + 1]);
    await provider.send("evm_mine", []);

    // 7. All participants claim their rewards - Sequential claims to avoid nonce issues
    await waitForTx(
      env.useCase.connect(dataProvider).claimRewards(USE_CASE_ID)
    );
    await provider.send("evm_mine", []);

    await waitForTx(env.useCase.connect(aiProvider1).claimRewards(USE_CASE_ID));
    await provider.send("evm_mine", []);

    await waitForTx(env.useCase.connect(aiProvider2).claimRewards(USE_CASE_ID));
    await provider.send("evm_mine", []);

    await waitForTx(
      env.useCase.connect(serviceProvider).claimRewards(USE_CASE_ID)
    );
    await provider.send("evm_mine", []);

    await waitForTx(
      env.useCase.connect(orchestrator).claimRewards(USE_CASE_ID)
    );

    // 8. Verify final balances
    const dataProviderBalance = await env.token.balanceOf(dataProvider.address);
    const aiProvider1Balance = await env.token.balanceOf(aiProvider1.address);
    const aiProvider2Balance = await env.token.balanceOf(aiProvider2.address);
    const serviceProviderBalance = await env.token.balanceOf(
      serviceProvider.address
    );
    const orchestratorBalance = await env.token.balanceOf(orchestrator.address);

    // Calculate expected rewards
    const expectedDataProviderReward =
      (REWARD_POOL * BigInt(DATA_PROVIDER_SHARE)) / 10000n;
    const expectedAiProvider1Reward =
      (REWARD_POOL * BigInt(AI_PROVIDER1_SHARE)) / 10000n;
    const expectedAiProvider2Reward =
      (REWARD_POOL * BigInt(AI_PROVIDER2_SHARE)) / 10000n;
    const expectedServiceProviderReward =
      (REWARD_POOL * BigInt(SERVICE_PROVIDER_SHARE)) / 10000n;
    const expectedOrchestratorReward =
      (REWARD_POOL * BigInt(ORCHESTRATOR_SHARE)) / 10000n;

    // Assert all balances match expected rewards
    expect(dataProviderBalance).to.equal(expectedDataProviderReward);
    expect(aiProvider1Balance).to.equal(expectedAiProvider1Reward);
    expect(aiProvider2Balance).to.equal(expectedAiProvider2Reward);
    expect(serviceProviderBalance).to.equal(expectedServiceProviderReward);

    // For orchestrator, consider both initial balance and deposited amount
    const orchestratorRewardBalance =
      orchestratorBalance -
      (orchestratorInitialBalance - orchestratorDepositAmount);
    expect(orchestratorRewardBalance).to.equal(expectedOrchestratorReward);
  });
});
