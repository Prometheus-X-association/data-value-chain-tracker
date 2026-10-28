import crypto from "node:crypto";
import { Contract, JsonRpcProvider, Signature, Wallet, ZeroAddress, formatEther } from "ethers";

export class PermanentError extends Error {
  constructor(message) {
    super(message);
    this.name = "PermanentError";
  }
}

const USE_CASE_ABI = [
  "function useCases(string) view returns (string id, address owner, uint96 totalRewardPool, uint96 remainingRewardPool, uint32 lockupPeriod, uint32 lockTime, bool rewardsLocked)",
  "function deposits(string, address) view returns (uint256)",
  "function getUseCaseInfo(string) view returns (tuple(string id, address owner, uint96 totalRewardPool, uint96 remainingRewardPool, uint32 lockupPeriod, uint32 lockTime, bool rewardsLocked, uint256 totalShares, tuple(address participant, uint96 rewardShare, uint96 fixedReward)[] participants, uint256 totalFixedRewards))",
  "function createUseCase(string useCaseId)",
  "function updateRewardShares(string useCaseId, address[] participants, uint96[] shares)",
  "function lockRewards(string useCaseId, uint32 lockupPeriod)",
  "function distribute(string useCaseId)",
  "event RewardsClaimed(string useCaseId, address participant, uint256 amount)",
  "error LockupPeriodNotEnded()",
  "error NoRewardsToClaim()",
  "error RewardsAlreadyLocked()",
  "error UseCaseAlreadyExists(string id)",
  "error NotUseCaseOwner()",
  "error FixedRewardsExceedPool()",
  "error NotAuthorizedDepositor()",
];

const TOKEN_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function nonces(address) view returns (uint256)",
];

const revertName = (contract, error) => {
  const data = error?.data || error?.info?.error?.data || error?.error?.data;
  if (error?.revert?.name) return error.revert.name;
  if (typeof data === "string") {
    try {
      return contract.interface.parseError(data)?.name || null;
    } catch {
      return null;
    }
  }
  return null;
};

export const createIncentiveClient = (config) => {
  const provider = new JsonRpcProvider(config.rpcUrl);
  const operator = new Wallet(config.operatorPrivateKey, provider);
  const useCase = new Contract(config.useCaseAddress, USE_CASE_ABI, operator);
  const token = new Contract(config.tokenAddress, TOKEN_ABI, provider);

  const send = async (label, txPromise) => {
    const tx = await txPromise;
    const receipt = await tx.wait();
    if (!receipt || receipt.status !== 1) {
      throw new Error(`${label} transaction ${tx.hash} failed`);
    }
    return receipt;
  };

  const signedPost = async (path, body) => {
    const rawBody = JSON.stringify(body);
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const signature = crypto
      .createHmac("sha256", config.incentiveApiHmacSecret)
      .update(`${timestamp}.${rawBody}`)
      .digest("hex");

    const response = await fetch(`${config.incentiveApiUrl}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-DVCT-Timestamp": timestamp,
        "X-DVCT-Signature": signature,
      },
      body: rawBody,
      signal: AbortSignal.timeout(30_000),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(`incentive-api answered ${response.status}: ${payload.error || "unknown error"}`);
      if (response.status >= 400 && response.status < 500) {
        throw new PermanentError(error.message);
      }
      throw error;
    }
    return payload;
  };

  const signPermit = async (value) => {
    const { chainId } = await provider.getNetwork();
    // Chain time, not wall-clock time: on a dev chain the two can differ (evm_increaseTime).
    const latestBlock = await provider.getBlock("latest");
    const deadline = Number(latestBlock?.timestamp ?? Math.floor(Date.now() / 1000)) + 3600;
    const nonce = await token.nonces(operator.address);
    const signature = await operator.signTypedData(
      { name: "PTXToken", version: "1", chainId, verifyingContract: config.tokenAddress },
      {
        Permit: [
          { name: "owner", type: "address" },
          { name: "spender", type: "address" },
          { name: "value", type: "uint256" },
          { name: "nonce", type: "uint256" },
          { name: "deadline", type: "uint256" },
        ],
      },
      { owner: operator.address, spender: config.useCaseAddress, value, nonce, deadline },
    );
    const { v, r, s } = Signature.from(signature);
    return { owner: operator.address, spender: config.useCaseAddress, amount: value.toString(), deadline, v, r, s };
  };

  return {
    operatorAddress: operator.address,

    // Creates the use case, or confirms that the operator already owns it.
    async ensureUseCase(useCaseId) {
      const { owner } = await useCase.useCases(useCaseId);
      if (owner === ZeroAddress) {
        await send("createUseCase", useCase.createUseCase(useCaseId));
        return;
      }
      if (owner !== operator.address) {
        throw new PermanentError(
          `On-chain use case "${useCaseId}" already exists and is owned by ${owner}, not by this trace-api`,
        );
      }
    },

    async setShares(useCaseId, plan) {
      const info = await useCase.getUseCaseInfo(useCaseId);
      if (info.rewardsLocked) {
        return;
      }
      const current = info.participants.map((p) => `${p.participant}:${p.rewardShare}`).join(",");
      const target = plan.map((p) => `${p.walletAddress}:${p.basisPoints}`).join(",");
      if (current !== target) {
        await send(
          "updateRewardShares",
          useCase.updateRewardShares(
            useCaseId,
            plan.map((p) => p.walletAddress),
            plan.map((p) => p.basisPoints),
          ),
        );
      }
    },

    // Deposits the reward pool through the incentive API (permit relayed by the API).
    // `pendingTxHash` is the deposit submitted by an earlier, interrupted attempt.
    async deposit(useCaseId, rewardPoolWei, pendingTxHash, rememberTx) {
      const { rewardsLocked } = await useCase.useCases(useCaseId);
      if (rewardsLocked) {
        return null;
      }

      if (pendingTxHash) {
        await provider.waitForTransaction(pendingTxHash, 1, 120_000);
      }

      const alreadyDeposited = await useCase.deposits(useCaseId, operator.address);
      if (alreadyDeposited >= rewardPoolWei) {
        return pendingTxHash || null;
      }

      const amount = rewardPoolWei - alreadyDeposited;
      const balance = await token.balanceOf(operator.address);
      if (balance < amount) {
        throw new PermanentError(
          `Operator ${operator.address} holds ${formatEther(balance)} PTX but ${formatEther(amount)} PTX are needed`,
        );
      }

      const permit = await signPermit(amount);
      const response = await signedPost("/api/incentives/distribute", {
        useCaseId,
        from: operator.address,
        to: config.useCaseAddress,
        amount: formatEther(amount),
        permit,
      });
      const txHash = response?.data?.transactionHash;
      if (!txHash) {
        throw new Error("incentive-api did not return a transaction hash");
      }
      await rememberTx(txHash);

      const receipt = await provider.waitForTransaction(txHash, 1, 120_000);
      if (!receipt || receipt.status !== 1) {
        throw new Error(`Deposit transaction ${txHash} failed`);
      }
      return txHash;
    },

    async lock(useCaseId, lockSeconds) {
      const { rewardsLocked } = await useCase.useCases(useCaseId);
      if (!rewardsLocked) {
        await send("lockRewards", useCase.lockRewards(useCaseId, lockSeconds));
      }
      const { lockTime, lockupPeriod } = await useCase.useCases(useCaseId);
      return Number(lockTime) + Number(lockupPeriod);
    },

    // Pushes the payouts once the lock has ended. Returns { waitSeconds } while it has not.
    async distribute(useCaseId, unlockAt) {
      // Use the pending block: an idle chain (e.g. Anvil, which mines only on transactions) does
      // not advance the latest block's timestamp, so "latest" would never see the lock end.
      const pending = await provider.getBlock("pending").catch(() => null);
      const chainNow = Number(pending?.timestamp ?? Math.floor(Date.now() / 1000));
      if (chainNow < unlockAt) {
        return { waitSeconds: Math.min(Math.max(unlockAt - chainNow + 2, 5), 3600) };
      }

      try {
        await useCase.distribute.staticCall(useCaseId, { blockTag: "pending" });
      } catch (error) {
        const reason = revertName(useCase, error);
        if (reason === "LockupPeriodNotEnded") {
          return { waitSeconds: 5 };
        }
        if (reason === "NoRewardsToClaim") {
          return { payouts: [], alreadyDistributed: true };
        }
        throw error;
      }

      const receipt = await send("distribute", useCase.distribute(useCaseId));
      const payouts = receipt.logs
        .map((log) => {
          try {
            return useCase.interface.parseLog(log);
          } catch {
            return null;
          }
        })
        .filter((parsed) => parsed?.name === "RewardsClaimed")
        .map((parsed) => ({ walletAddress: parsed.args.participant, amount: formatEther(parsed.args.amount) }));

      return { payouts, transactionHash: receipt.hash };
    },
  };
};
