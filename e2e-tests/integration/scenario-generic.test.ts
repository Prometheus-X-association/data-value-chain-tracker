import { describe, it, before, after } from "mocha";
import { expect } from "chai";
import { ethers } from "ethers";
import { setupTestEnvironment, TestEnvironment } from "./setup";
import { IncentiveSigner } from "../../incentive/api/client/lib/IncentiveSigner";
import { waitForTx } from "../helpers/helpers";
import axios from "axios";
import * as fs from "fs";

const configFilePath = process.env.CONFIG_FILE;
if (!configFilePath) {
  console.error("Config file path is not set.");
  process.exit(1);
}

const configData = JSON.parse(fs.readFileSync(configFilePath, "utf-8"));

describe(configData.useCaseName, function () {
  this.timeout(60000);

  let env: TestEnvironment;
  const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
  const agents: Record<string, ethers.Wallet> = {};
  const agentShares: number[] = [];
  let rewardDepositor: ethers.Wallet;
  let incentiveSigner: IncentiveSigner;
  let isOrchestrator = false;

  const LOCK_DURATION = 24 * 60 * 60; // 1 day
  const REWARD_POOL = ethers.parseEther("100");
  const USE_CASE_ID = configData.useCaseName;

  let orchestratorInitialBalance = 0n;
  let orchestratorDepositAmount = 0n;

  // Set up agents
  for (const data of configData.participantShare) {
    agents[data.role] = new ethers.Wallet(data.participantWallet, provider);
    agentShares.push(data.numOfShare);

    if (data.rewardDepositor) {
      rewardDepositor = agents[data.role];
      if (data.role === "Orchestrator") {
        isOrchestrator = true;
      }
    }
  }

  const agentAddresses = Object.values(agents).map(a => a.address);

  before(async () => {
    console.log("before() started");

    await provider.send("hardhat_reset", []);

    env = await setupTestEnvironment();

    incentiveSigner = new IncentiveSigner(
      rewardDepositor.privateKey,
      await env.token.getAddress(),
      provider
    );

    await waitForTx(env.token.transfer(rewardDepositor.address, ethers.parseEther("2000")));

    if (agents["Orchestrator"]) {
      orchestratorInitialBalance = await env.token.balanceOf(agents["Orchestrator"].address);
      orchestratorDepositAmount = REWARD_POOL;
    }
  });

  after(async () => {
    console.log("after() started");
    if (env.apiServer) await env.apiServer.close();
  });

  it(`should complete full cycle of ${configData.useCaseName}`, async () => {
    // Create use case + set shares
    const creator = rewardDepositor && isOrchestrator
      ? rewardDepositor
      : agents["Data-Provider"];

    await waitForTx(env.useCase.connect(creator).createUseCase(USE_CASE_ID));
    await waitForTx(env.useCase.connect(creator).updateRewardShares(USE_CASE_ID, agentAddresses, agentShares));

    console.log("Total shares:", await env.useCase.totalRewardShares(USE_CASE_ID));

    for (const role in agents) {
      if (role.includes("AI-Provider")) {
        const info = await env.useCase.getParticipantInfo(USE_CASE_ID, agents[role]);
        console.log(`${role} rewardShare:`, info.rewardShare.toString());
        console.log(`${role} fixedReward:`, info.fixedReward.toString());
      }
    }

    // Deposit reward pool
    const signedRequest = await incentiveSigner.createUseCaseDepositRequest(
      USE_CASE_ID,
      env.contracts.useCaseAddress,
      ethers.formatEther(REWARD_POOL)
    );

    const response = await axios.post(`${env.apiUrl}/api/incentives/distribute`, signedRequest);
    expect(response.status).to.equal(200);

    const txHash = (response.data as { data: { transactionHash: string } }).data.transactionHash;

    const receipt = await provider.waitForTransaction(txHash, 1); 
    expect(receipt?.status).to.equal(1); 


    const useCaseInfo = await env.useCase.useCases(USE_CASE_ID);
    console.log("Total reward pool:", useCaseInfo.totalRewardPool.toString());
    console.log("Remaining reward pool:", useCaseInfo.remainingRewardPool.toString());

    // Lock rewards
    await waitForTx(env.useCase.connect(creator).lockRewards(USE_CASE_ID, LOCK_DURATION));

    // Fast forward time
    await provider.send("evm_increaseTime", [LOCK_DURATION + 1]);
    await provider.send("evm_mine", []);

    // Claim rewards
    for (const role in agents) {
      if (role !== "RewardDepositor") {
        await waitForTx(env.useCase.connect(agents[role]).claimRewards(USE_CASE_ID));
        await provider.send("evm_mine", []);
      }
    }

    // Verify rewards
    const totalShares = BigInt(agentShares.reduce((a, b) => a + b, 0));
    const expectedRewards: Record<string, bigint> = {};
    const actualBalances: Record<string, bigint> = {};

    let i = 0;
    for (const role in agents) {
      if (role !== "RewardDepositor") {
        expectedRewards[role] = (REWARD_POOL * BigInt(agentShares[i])) / totalShares;
        actualBalances[role] = await env.token.balanceOf(agents[role].address);
        i++;
      }
    }

    if (isOrchestrator) {
      actualBalances["Orchestrator"] -= (orchestratorInitialBalance - orchestratorDepositAmount);
    }

    console.log("Final balances:", actualBalances);

    for (const role in expectedRewards) {
      expect(actualBalances[role]).to.equal(expectedRewards[role], `Mismatch for ${role}`);
    }
  });
});
