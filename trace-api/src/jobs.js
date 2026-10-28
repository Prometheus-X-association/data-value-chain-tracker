import crypto from "node:crypto";
import { PermanentError } from "./incentive.js";
import { ValidationError } from "./validation.js";
import { recordExchangeNodes, recordTraceability } from "./traceability.js";
import { SourceError } from "./dataspace/http.js";
import { isExchangeComplete } from "./dataspace/exchange.js";

const EXCHANGE_POLL_SECONDS = 15;

const MAX_ATTEMPTS = 5;
const TERMINAL = new Set(["succeeded", "failed"]);

export const createJobStore = async (db) => {
  const jobs = db.collection("traceJobs");
  await jobs.createIndex({ idempotencyKey: 1 }, { unique: true });
  await jobs.createIndex({ status: 1, nextRunAt: 1 });
  await jobs.createIndex({ "payload.useCaseName": 1, "payload.reachEndFlow": 1 });

  return {
    // Returns { job, created }. A request describing an already-received event returns its job.
    async enqueue({ payload, idempotencyKey, plan }) {
      const now = new Date();
      const job = {
        _id: crypto.randomUUID(),
        idempotencyKey,
        status: "queued",
        step: "trace",
        payload,
        result: { plan },
        attempts: 0,
        createdAt: now,
        updatedAt: now,
        nextRunAt: now,
      };
      try {
        await jobs.insertOne(job);
        return { job, created: true };
      } catch (error) {
        if (error?.code !== 11000) throw error;
        return { job: await jobs.findOne({ idempotencyKey }), created: false };
      }
    },

    get: (id) => jobs.findOne({ _id: String(id) }),

    claimNext: () =>
      jobs.findOneAndUpdate(
        { status: { $in: ["queued", "waiting"] }, nextRunAt: { $lte: new Date() } },
        { $set: { status: "running", updatedAt: new Date() } },
        { sort: { nextRunAt: 1 }, returnDocument: "after" },
      ),

    update: (id, fields) => jobs.updateOne({ _id: id }, { $set: { ...fields, updatedAt: new Date() } }),

    // A single trace-api instance owns the queue: jobs left running by a crash are resumed.
    recoverInterrupted: () =>
      jobs.updateMany({ status: "running" }, { $set: { status: "queued", nextRunAt: new Date() } }),

    findOtherPayoutForUseCase: (useCaseName, excludeId) =>
      jobs.findOne({
        _id: { $ne: excludeId },
        "payload.useCaseName": useCaseName,
        "payload.reachEndFlow": true,
        "result.useCaseClaimed": true,
        status: { $ne: "failed" },
      }),
  };
};

export const toPublicJob = (job) => ({
  jobId: job._id,
  status: job.status,
  step: job.step,
  createdAt: job.createdAt,
  updatedAt: job.updatedAt,
  nextRunAt: job.status === "waiting" ? job.nextRunAt : undefined,
  dataExchange: job.payload?.dataExchange,
  result: {
    traceNodes: job.result?.traceNodes,
    useCaseId: job.result?.useCaseId,
    rewardPool: job.result?.rewardPool,
    depositTransaction: job.result?.depositTx,
    unlockAt: job.result?.unlockAt ? new Date(job.result.unlockAt * 1000) : undefined,
    distributeTransaction: job.result?.distributeTx,
    payouts: job.result?.payouts,
  },
  error: job.error || undefined,
});

export const isTerminal = (job) => TERMINAL.has(job.status);

export const createWorker = ({ store, coreApi, incentive, dataspace, config, logger }) => {
  let timer = null;
  let running = false;
  let stopped = false;

  const steps = {
    async trace(job) {
      if (job.payload.kind === "dataExchange") {
        job.result.traceNodes = await recordExchangeNodes(coreApi, job.payload.nodes);
        return job.payload.reachEndFlow ? "awaitExchange" : "done";
      }
      job.result.traceNodes = await recordTraceability(coreApi, job.payload);
      return job.payload.reachEndFlow ? "useCase" : "done";
    },

    // The last service of a chain may call while the exchange is still finishing: rewards are
    // only paid once the connector reports the exchange as fully completed.
    async awaitExchange(job) {
      const { id, connector } = job.payload.dataExchange;
      const exchange = await dataspace.getDataExchange(connector, id);
      if (/ERROR|FAIL/i.test(String(exchange.status || ""))) {
        throw new PermanentError(`Data exchange ${id} ended with status ${exchange.status}`);
      }
      if (isExchangeComplete(exchange)) {
        return "useCase";
      }

      job.result.exchangeWaitSince = job.result.exchangeWaitSince || Date.now();
      if (Date.now() - job.result.exchangeWaitSince > config.dataspace.completionTimeoutSeconds * 1000) {
        throw new PermanentError(
          `Data exchange ${id} did not complete within ${config.dataspace.completionTimeoutSeconds}s (status ${exchange.status})`,
        );
      }
      return { wait: EXCHANGE_POLL_SECONDS };
    },

    async useCase(job) {
      const useCaseId = job.payload.useCaseName;
      const other = await store.findOtherPayoutForUseCase(useCaseId, job._id);
      if (other) {
        throw new PermanentError(
          `Use case "${useCaseId}" is settled by job ${other._id}; each use case is paid out once`,
        );
      }
      // Claim the use case name before touching the chain so a concurrent job sees it.
      job.result.useCaseClaimed = true;
      job.result.useCaseId = useCaseId;
      await store.update(job._id, { result: job.result });

      await incentive.ensureUseCase(useCaseId);
      return "shares";
    },

    async shares(job) {
      await incentive.setShares(job.result.useCaseId, job.result.plan.participants);
      return "metadata";
    },

    async metadata(job) {
      const walletById = new Map(job.result.plan.walletByParticipant);
      await coreApi.saveUseCaseMetadata({
        useCaseId: job.result.useCaseId,
        useCaseName: job.payload.useCaseDisplayName || job.payload.useCaseName,
        sourceUseCaseId: job.payload.useCaseId,
        rewardPool: job.result.plan.rewardPool,
        participants: job.payload.participantShare.map((participant) => ({
          participantId: participant.participantId,
          participantName: participant.participantName,
          role: participant.role,
          walletAddress: walletById.get(participant.participantId) || "",
          numOfShare: participant.numOfShare,
        })),
      });
      job.result.rewardPool = job.result.plan.rewardPool;
      return "deposit";
    },

    async deposit(job) {
      job.result.depositTx = await incentive.deposit(
        job.result.useCaseId,
        BigInt(job.result.plan.rewardPoolWei),
        job.result.depositTx,
        async (txHash) => {
          job.result.depositTx = txHash;
          await store.update(job._id, { result: job.result });
        },
      );
      return "lock";
    },

    async lock(job) {
      job.result.unlockAt = await incentive.lock(job.result.useCaseId, config.lockSeconds);
      return "distribute";
    },

    async distribute(job) {
      const outcome = await incentive.distribute(job.result.useCaseId, job.result.unlockAt);
      if (outcome.waitSeconds) {
        return { wait: outcome.waitSeconds };
      }
      job.result.payouts = outcome.payouts;
      job.result.distributeTx = outcome.transactionHash;
      return "done";
    },
  };

  const process = async (job) => {
    job.result = job.result || {};

    while (job.step !== "done") {
      const handler = steps[job.step];
      if (!handler) {
        throw new PermanentError(`Unknown job step ${job.step}`);
      }

      const next = await handler(job);
      if (next?.wait) {
        const nextRunAt = new Date(Date.now() + next.wait * 1000);
        await store.update(job._id, { status: "waiting", result: job.result, nextRunAt, attempts: 0, error: null });
        logger.info(`Job ${job._id} waiting ${next.wait}s at step ${job.step}`);
        return;
      }

      job.step = next;
      job.attempts = 0;
      // A completed step also clears the error of an earlier, retried attempt.
      await store.update(job._id, { step: job.step, result: job.result, attempts: 0, error: null });
    }

    await store.update(job._id, { status: "succeeded", result: job.result, error: null });
    logger.info(`Job ${job._id} succeeded`);
  };

  const handleFailure = async (job, error) => {
    const attempts = (job.attempts || 0) + 1;
    const permanent =
      error instanceof PermanentError ||
      error instanceof ValidationError ||
      (error instanceof SourceError && !error.retryable);

    if (permanent || attempts >= MAX_ATTEMPTS) {
      logger.error(`Job ${job._id} failed at step ${job.step}: ${error.message}`);
      await store.update(job._id, {
        status: "failed",
        attempts,
        result: job.result,
        error: { step: job.step, message: error.message },
      });
      return;
    }

    const delaySeconds = 5 * 2 ** (attempts - 1);
    logger.warn(`Job ${job._id} step ${job.step} failed (attempt ${attempts}), retrying in ${delaySeconds}s: ${error.message}`);
    await store.update(job._id, {
      status: "queued",
      attempts,
      result: job.result,
      nextRunAt: new Date(Date.now() + delaySeconds * 1000),
      error: { step: job.step, message: error.message, retrying: true },
    });
  };

  // Jobs run one at a time so the operator wallet never sends two transactions concurrently.
  const tick = async () => {
    if (running || stopped) return;
    running = true;
    try {
      for (let job = await store.claimNext(); job && !stopped; job = await store.claimNext()) {
        try {
          await process(job);
        } catch (error) {
          await handleFailure(job, error);
        }
      }
    } catch (error) {
      logger.error(`Job worker error: ${error.message}`);
    } finally {
      running = false;
    }
  };

  return {
    start() {
      timer = setInterval(tick, 2000);
      void tick();
    },
    wake: () => void tick(),
    // Processes every due job once (tests).
    runPending: tick,
    stop() {
      stopped = true;
      clearInterval(timer);
    },
  };
};
