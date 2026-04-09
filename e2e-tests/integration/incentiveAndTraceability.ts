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

const DEV_GAS_BALANCE = ethers.parseEther("1000");

const ensureDevGasBalance = async (
  provider: ethers.JsonRpcProvider,
  address: string,
  targetBalance: bigint = DEV_GAS_BALANCE,
) => {
  const currentBalance = await provider.getBalance(address);

  if (currentBalance >= targetBalance) {
    return;
  }

  const targetHex = ethers.toQuantity(targetBalance);

  try {
    await provider.send("anvil_setBalance", [address, targetHex]);
    return;
  } catch (_error) {
    // Fall back for local chains that expose Hardhat's RPC extensions.
  }

  await provider.send("hardhat_setBalance", [address, targetHex]);
};

const resolveRewardPool = (configData: any): bigint => {
  const rawRewardPool =
    configData.rewardPool ??
    configData.rewardPoolAmount ??
    configData.rewardAmount ??
    "1000";

  if (typeof rawRewardPool === "number") {
    return ethers.parseEther(rawRewardPool.toString());
  }

  if (typeof rawRewardPool === "string") {
    const normalized = rawRewardPool.trim();
    if (normalized.length === 0) {
      throw new Error("Reward pool value is empty");
    }

    return ethers.parseEther(normalized);
  }

  throw new Error("Reward pool must be provided as a number or string");
};

const getInputData = () => {
  const configFilePath = process.env.CONFIG_FILE;
  if (!configFilePath) {
    console.error("Config file path is not set.");
    process.exit(1);
  }

  return JSON.parse(fs.readFileSync(configFilePath, "utf-8"));
};

const MAX_TOTAL_SHARES = 10_000;

const normalizeSharesToBasisPoints = (participants: any[]): number[] => {
  const weights = participants.map((participant) => {
    const numericValue = Number(participant?.numOfShare ?? 0);

    if (!Number.isFinite(numericValue) || numericValue < 0) {
      throw new Error(
        `Invalid numOfShare for participant "${participant?.participantName || participant?.role || participant?.participantId || "unknown"}"`,
      );
    }

    return numericValue;
  });

  const totalWeight = weights.reduce((sum, value) => sum + value, 0);

  if (totalWeight <= 0) {
    throw new Error("participantShare numOfShare total must be greater than zero");
  }

  const normalizedShares = weights.map((weight, index) => {
    const rawShare = (weight / totalWeight) * MAX_TOTAL_SHARES;
    const floorShare = Math.floor(rawShare);

    return {
      index,
      share: floorShare,
      remainder: rawShare - floorShare,
    };
  });

  let assignedShares = normalizedShares.reduce((sum, entry) => sum + entry.share, 0);
  let remainingShares = MAX_TOTAL_SHARES - assignedShares;

  normalizedShares
    .slice()
    .sort((left, right) => right.remainder - left.remainder)
    .forEach((entry) => {
      if (remainingShares <= 0) {
        return;
      }

      normalizedShares[entry.index].share += 1;
      assignedShares += 1;
      remainingShares -= 1;
    });

  if (assignedShares !== MAX_TOTAL_SHARES) {
    throw new Error("Failed to normalize participant shares to 100%");
  }

  return normalizedShares.map((entry) => entry.share);
};

async function main(): Promise<FinalResult> {
  const configData = getInputData();
  const rpcUrl = process.env.INCENTIVE_RPC_URL || "http://127.0.0.1:8545";
  const agents: { [key: string]: ethers.Wallet } = {};
  const agentShares: Record<string, number> = {};
  const LOCK_DURATION = 24 * 60 * 60;
  const USE_CASE_ID = String(configData.useCaseName ?? "").trim();

  if (!USE_CASE_ID) {
    throw new Error("Missing useCaseName for incentive execution");
  }

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const REWARD_POOL = resolveRewardPool(configData);
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
  const normalizedShares = normalizeSharesToBasisPoints(configData?.participantShare || []);
  
  configData?.participantShare.map((data: any) => {
    if(!agents[data.role]){
        agents[data.role] = new ethers.Wallet(data.participantWallet, provider);
        agentShares[data.role] = normalizedShares[index];
    }else{
        agents[data.role + index] = new ethers.Wallet(data.participantWallet, provider);
        agentShares[data.role + index] = normalizedShares[index];
    }

    if (data.role === "orchestrator") {
        rewardDepositor = agents[data.role];
        isOrchestrator = true;
    }
    index = index + 1;
  });

  const agentAdresses = Object.values(agents).map((wallet: ethers.Wallet) => wallet.address);

  await ensureDevGasBalance(provider, rewardDepositor.address);

  for (const wallet of Object.values(agents)) {
    await ensureDevGasBalance(provider, wallet.address);
  }

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
    await waitForTx(env.token.transfer(rewardDepositor.address, REWARD_POOL));
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
