import { ethers } from "ethers";
import { setupTestEnvironment } from "./setup";
import { IncentiveSigner } from "../../incentive/api/client/lib/IncentiveSigner";
import { waitForTx } from "../helpers/helpers";
import axios from "axios";
import * as fs from "fs";
import { expect } from "chai";

interface ParticipantResult {
  role: string;
  address: string;
  claimedAmount: string;
}

interface FinalResult {
  apiResponseStatus: number;
  apiResponseBody: any;
  participants: ParticipantResult[];
}

const getInputData = () => {
  const configFilePath = process.env.CONFIG_FILE;
  if (!configFilePath) {
    console.error("Config file path is not set.");
    process.exit(1);
  }

  return JSON.parse(fs.readFileSync(configFilePath, "utf-8"));
};



async function main(): Promise<FinalResult> {
  const configData = getInputData();
  const agents: { [key: string]: ethers.Wallet } = {};
  const agentShares: Record<string, number> = {};
  const LOCK_DURATION = 24 * 60 * 60;
  const USE_CASE_ID = configData.useCaseName;

  const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
  await provider.send("hardhat_reset", []);
  let REWARD_POOL = ethers.parseEther("1000");
  let isOrchestrator = false;
  
  let env;
  try {
    env = await setupTestEnvironment();
  } catch (err) {
    console.error("Error setting up test environment:", err);
    process.exit(1);
  }

  let rewardDepositor = new ethers.Wallet("0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80", provider);
  var index = 0;
  
  configData?.participantShare.map((data: any) => {
    if(!agents[data.role]){
        agents[data.role] = new ethers.Wallet(data.participantWallet, provider);
        agentShares[data.role] = data.numOfShare * 100;
    }else{
        agents[data.role + index] = new ethers.Wallet(data.participantWallet, provider);
        agentShares[data.role + index] = data.numOfShare * 100;
    }

    if (data.role === "orchestrator") {
        rewardDepositor = agents[data.role];
        isOrchestrator = true;
    }
    index = index + 1;
  });

  const agentAdresses = Object.values(agents).map((wallet: ethers.Wallet) => wallet.address);

  let incentiveSigner;
  try {
    incentiveSigner = new IncentiveSigner(
      rewardDepositor?.privateKey,
      await env.token.getAddress(),
      provider
    );
  } catch (err) {
    console.error("Error creating IncentiveSigner:", err);
    process.exit(1);
  }

  try {
    await waitForTx(env.token.transfer(rewardDepositor.address, ethers.parseEther("1000")));
  } catch (err) {
    console.error("Error transferring tokens to rewardDepositor:", err);
    process.exit(1);
  }

  const participantShares = Object.values(agentShares);

  try {
    if (isOrchestrator) {
      await waitForTx(env.useCase.connect(agents["orchestrator"]).createUseCase(USE_CASE_ID));
      await waitForTx(env.useCase.connect(agents["orchestrator"]).updateRewardShares(USE_CASE_ID, agentAdresses, participantShares));
    } else {
      await waitForTx(env.useCase.connect(agents["participant"]).createUseCase(USE_CASE_ID));
      await waitForTx(env.useCase.connect(agents["participant"]).updateRewardShares(USE_CASE_ID, agentAdresses, participantShares));
    }
  } catch (err) {
    console.error("Error creating use case or updating reward shares:", err);
    process.exit(1);
  }

  let response;
  try {
    const signedRequest = await incentiveSigner.createUseCaseDepositRequest(USE_CASE_ID, env.contracts.useCaseAddress, ethers.formatEther(REWARD_POOL));
    response = await axios.post(`${env.apiUrl}/api/incentives/distribute`, signedRequest);
    console.log(`API Response Status: ${response.status}`);
    console.log("API Response Body:", response.data);
  } catch (err) {
    console.error("Error sending deposit request to API:", err);
    process.exit(1);
  }

  try {
    const txHash = (response.data as { data: { transactionHash: string } }).data.transactionHash;
    const receipt = await provider.waitForTransaction(txHash, 1); // wait for 1 confirmation
    expect(receipt?.status).to.equal(1); // ensure it was successful
    await provider.send("evm_mine", []);
    await provider.send("evm_mine", []);
  } catch (err) {
    console.error("Error waiting for or mining transaction:", err);
    process.exit(1);
  }

  try {
    if (isOrchestrator) {
      await waitForTx(env.useCase.connect(rewardDepositor).lockRewards(USE_CASE_ID, LOCK_DURATION));
    } else {
      await waitForTx(env.useCase.connect(agents['participant']).lockRewards(USE_CASE_ID, LOCK_DURATION));
    }
  } catch (err) {
    console.error("Error locking rewards:", err);
    process.exit(1);
  }

  try {
    await provider.send("evm_increaseTime", [LOCK_DURATION + 1]);
    await provider.send("evm_mine", []);
  } catch (err) {
    console.error("Error increasing evm time:", err);
    process.exit(1);
  }

  const participantsResults: ParticipantResult[] = [];

  try {
    for (const role in agents) {
      const wallet = agents[role];
      if (agentShares[role as keyof typeof agentShares] > 0) {
        const balanceBefore = await env.token.balanceOf(wallet.address);
        await waitForTx(env.useCase.connect(wallet).claimRewards(USE_CASE_ID));
        await provider.send("evm_mine", []);
        const balanceAfter = await env.token.balanceOf(wallet.address);
        const claimed = balanceAfter - balanceBefore;
        participantsResults.push({
          role,
          address: wallet.address,
          claimedAmount: ethers.formatEther(claimed),
        });
        console.log(`${role} (${wallet.address}) claimed: ${ethers.formatEther(claimed)} tokens`);
      }
    }
  } catch (err) {
    console.error("Error in claiming rewards for participants:", err);
    process.exit(1);
  }

  console.log("Reward distribution complete.");

  return {
    apiResponseStatus: response.status,
    apiResponseBody: response.data,
    participants: participantsResults,
  };
}

main()
  .then((result) => {
    console.log(result);
    process.exit(0);
  })
  .catch((err) => {
    console.error("Fatal error in main():", err);
    process.exit(1);
  });
