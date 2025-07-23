import { describe, it, before, after } from "mocha";
import { expect } from "chai";
import { ethers } from "ethers";
import { setupTestEnvironment, TestEnvironment } from "./setup";
import { IncentiveSigner } from "../../incentive/api/client/lib/IncentiveSigner";
import { waitForTx } from "../helpers/helpers";
import axios from "axios";

describe("Scenario 3: Educational Data Provider and AI Service Provider", function () {
  this.timeout(60000); // Set timeout to 60 seconds

  let env: TestEnvironment;
  let provider: ethers.JsonRpcProvider;
  let dataProvider: ethers.Wallet; // Educational institution
  let aiProvider: ethers.Wallet; // AI service company
  let rewardDepositor: ethers.Wallet; // User providing rewards
  let incentiveSigner: IncentiveSigner;

  const LOCK_DURATION = 24 * 60 * 60; // 1 day lock
  const REWARD_POOL = ethers.parseEther("1000"); // 1000 PTX tokens
  const DATA_PROVIDER_SHARE = 6000; // 60%
  const AI_PROVIDER_SHARE = 4000; // 40%
  const USE_CASE_ID = "educational-data-sharing-1";

  before(async () => {
    // Setup provider and wallets
    provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");

    dataProvider = new ethers.Wallet(
      "0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a",
      provider
    );
    aiProvider = new ethers.Wallet(
      "0x8b3a350cf5c34c9194ca85829a2df0ec3153be0318b5e2d3348e872092edffba",
      provider
    );
    rewardDepositor = new ethers.Wallet(
      "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
      provider
    );
    env = await setupTestEnvironment();

    // Initialize IncentiveSigner
    incentiveSigner = new IncentiveSigner(
      rewardDepositor.privateKey,
      await env.token.getAddress(),
      provider
    );

    // Transfer initial tokens to reward depositor
    await waitForTx(
      env.token.transfer(rewardDepositor.address, ethers.parseEther("2000"))
    );
  });
  after(async () => {
    if (env?.apiServer) {
      await env.apiServer.close();
    }
  });

  it("should complete full cycle of educational data sharing scenario", async () => {
    // 1. Data Provider creates the use case
    await waitForTx(
      env.useCase.connect(dataProvider).createUseCase(USE_CASE_ID)
    );

    // 2. Set up participant shares
    const participants = [dataProvider.address, aiProvider.address];
    const shares = [DATA_PROVIDER_SHARE, AI_PROVIDER_SHARE];
    await waitForTx(
      env.useCase
        .connect(dataProvider)
        .updateRewardShares(USE_CASE_ID, participants, shares)
    );

    console.log(
      "Shares set:",
      await env.useCase.totalRewardShares(USE_CASE_ID)
    );
    console.log(
      "AI Provider share:",
      (await env.useCase.getParticipantInfo(USE_CASE_ID, aiProvider.address))
        .rewardShare
    );
    console.log(
      "AI Provider share:",
      (await env.useCase.getParticipantInfo(USE_CASE_ID, aiProvider.address))
        .fixedReward
    );

    // 3. Create signed request for reward distribution using IncentiveSigner
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

    const { totalRewardPool, remainingRewardPool } =
      await env.useCase.useCases(USE_CASE_ID);
    console.log("Total reward pool:", totalRewardPool);
    console.log("Remaining reward pool:", remainingRewardPool);

    // 5. Data Provider locks the rewards
    await waitForTx(
      env.useCase.connect(dataProvider).lockRewards(USE_CASE_ID, LOCK_DURATION)
    );

    // 6. Wait for lock duration to pass
    await provider.send("evm_increaseTime", [LOCK_DURATION + 1]);
    await provider.send("evm_mine", []);

    // 7. Both providers claim their rewards
    await waitForTx(
      env.useCase.connect(dataProvider).claimRewards(USE_CASE_ID)
    );

    await waitForTx(env.useCase.connect(aiProvider).claimRewards(USE_CASE_ID));

    console.log(
      "Final AI balance:",
      await env.token.balanceOf(aiProvider.address)
    );
    console.log(
      "Final Data Provider balance:",
      await env.token.balanceOf(dataProvider.address)
    );

    // 8. Verify final balances
    const dataProviderBalance = await env.token.balanceOf(dataProvider.address);
    const aiProviderBalance = await env.token.balanceOf(aiProvider.address);
    const expectedDataProviderReward =
      (REWARD_POOL * BigInt(DATA_PROVIDER_SHARE)) / 10000n;
    const expectedAiProviderReward =
      (REWARD_POOL * BigInt(AI_PROVIDER_SHARE)) / 10000n;

    expect(dataProviderBalance).to.equal(expectedDataProviderReward);
    expect(aiProviderBalance).to.equal(expectedAiProviderReward);
  });
});
