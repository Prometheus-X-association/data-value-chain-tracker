import crypto from "node:crypto";
import { pathToFileURL } from "node:url";
import express from "express";
import { MongoClient } from "mongodb";
import { loadConfig } from "./config.js";
import { createIncentiveClient } from "./incentive.js";
import { createJobStore, createWorker, isTerminal, toPublicJob } from "./jobs.js";
import { loadWalletRegistry } from "./registry.js";
import { createCoreApiClient } from "./traceability.js";
import { SourceError, createSafeFetcher } from "./dataspace/http.js";
import { buildExchangeJob, createDataspaceClient, resolveConnector, resolveDataExchange } from "./dataspace/exchange.js";
import {
  ValidationError,
  buildIdempotencyKey,
  buildPayoutPlan,
  parseRewardPool,
  validateRunScriptPayload,
} from "./validation.js";

const logger = {
  info: (message) => console.log(`${new Date().toISOString()} info: ${message}`),
  warn: (message) => console.warn(`${new Date().toISOString()} warn: ${message}`),
  error: (message) => console.error(`${new Date().toISOString()} error: ${message}`),
};

const MAX_WAIT_SECONDS = 60;

export const createApp = ({ config, store, worker, dataspace = null }) => {
  const app = express();
  app.disable("x-powered-by");
  app.use(express.json({ limit: "256kb" }));

  const expectedToken = crypto.createHash("sha256").update(config.apiToken).digest();
  const requireApiToken = (req, res, next) => {
    const header = String(req.headers.authorization || "");
    const presented = header.startsWith("Bearer ") ? header.slice(7) : "";
    const presentedDigest = crypto.createHash("sha256").update(presented).digest();
    if (!presented || !crypto.timingSafeEqual(presentedDigest, expectedToken)) {
      return res.status(401).json({ error: "Authentication required" });
    }
    return next();
  };

  const waitForProgress = async (jobId, seconds) => {
    const deadline = Date.now() + seconds * 1000;
    let job = await store.get(jobId);
    while (job && !isTerminal(job) && job.status !== "waiting" && Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 250));
      job = await store.get(jobId);
    }
    return job;
  };

  app.get("/health", (req, res) => res.json({ status: "ok" }));

  // Called by the PDC for every data exchange (and by workflow engines).
  // Validates synchronously, then records traceability and settles the payout as a job.
  app.post("/api/run-script", requireApiToken, async (req, res, next) => {
    try {
      const payload = validateRunScriptPayload(req.body);
      let plan = null;

      if (payload.reachEndFlow) {
        const registry = loadWalletRegistry(config.organizationsFile);
        const { rewardPool, rewardPoolWei } = parseRewardPool(payload, config);
        const participants = buildPayoutPlan(payload.participantShare, registry);
        plan = {
          rewardPool,
          rewardPoolWei: rewardPoolWei.toString(),
          participants,
          walletByParticipant: payload.participantShare.map((participant) => [
            participant.participantId,
            registry.resolve(participant.participantId)?.walletAddress || "",
          ]),
        };
      }

      const { job, created } = await store.enqueue({
        payload,
        idempotencyKey: buildIdempotencyKey(payload),
        plan,
      });
      worker.wake();

      const waitSeconds = Math.min(Number(req.query.wait) || 0, MAX_WAIT_SECONDS);
      const current = waitSeconds > 0 ? await waitForProgress(job._id, waitSeconds) : job;

      res.status(created && !isTerminal(current) ? 202 : 200).json({
        message: created ? "Event accepted" : "Event already received",
        statusUrl: `/api/jobs/${job._id}`,
        ...toPublicJob(current),
      });
    } catch (error) {
      if (error instanceof ValidationError) {
        return res.status(400).json({ error: error.message });
      }
      return next(error);
    }
  });

  // --- Data-exchange endpoint: everything is read from the connector, contract and catalog ---

  const resolveExchangeJob = async (req) => {
    if (!config.dataspace?.enabled || !dataspace) {
      const error = new Error(
        "Data-exchange processing is not configured (PDC_CONNECTOR_DOMAINS, CATALOG_API_DOMAINS, CONTRACT_API_DOMAINS)",
      );
      error.status = 503;
      throw error;
    }
    const connector = resolveConnector(req.query.connector, config.dataspace);
    const resolved = await resolveDataExchange(dataspace, {
      dataExchangeId: req.params.dataExchangeId,
      connector,
    });
    const reachEndFlow = String(req.query.reachEndFlow ?? "true") !== "false";
    const registry = loadWalletRegistry(config.organizationsFile);
    return { resolved, reachEndFlow, ...buildExchangeJob(resolved, { registry, config, reachEndFlow }) };
  };

  const sendExchangeError = (res, next, error) => {
    if (error instanceof ValidationError) {
      return res.status(400).json({ error: error.message });
    }
    if (error instanceof SourceError) {
      return res.status(502).json({ error: error.message });
    }
    if (error.status === 503) {
      return res.status(503).json({ error: error.message });
    }
    return next(error);
  };

  const summarize = ({ resolved, plan, payload }) => ({
    dataExchange: {
      id: resolved.dataExchangeId,
      providerDataExchangeId: resolved.providerDataExchangeId,
      connector: resolved.connector,
      status: resolved.status,
      completed: resolved.completed,
    },
    contractId: resolved.contractId,
    serviceChain: { id: resolved.chainId, name: resolved.chainName, ecosystem: resolved.ecosystemName },
    participants: payload.participantShare.map((participant) => ({
      participantId: participant.participantId,
      name: participant.participantName,
      role: participant.role,
      weight: participant.numOfShare,
    })),
    hops: payload.hops,
    payout: plan
      ? {
          onChainUseCaseId: payload.useCaseName,
          rewardPool: plan.rewardPool,
          shares: plan.participants.map((entry) => ({
            organizationId: entry.organizationId,
            walletAddress: entry.walletAddress,
            basisPoints: entry.basisPoints,
          })),
        }
      : null,
  });

  // Called by the last service of a service chain with the data exchange id it received
  // (x-ptx-dataexchangeid). Reward pool and weights come from the exchange's query params.
  app.post("/api/dataexchanges/:dataExchangeId/run", requireApiToken, async (req, res, next) => {
    try {
      const prepared = await resolveExchangeJob(req);
      const { job, created } = await store.enqueue({
        payload: prepared.payload,
        idempotencyKey: `dataexchange:${prepared.resolved.providerDataExchangeId}:${prepared.reachEndFlow ? "settle" : "trace"}`,
        plan: prepared.plan,
      });
      worker.wake();

      const waitSeconds = Math.min(Number(req.query.wait) || 0, MAX_WAIT_SECONDS);
      const current = waitSeconds > 0 ? await waitForProgress(job._id, waitSeconds) : job;

      return res.status(created && !isTerminal(current) ? 202 : 200).json({
        message: created ? "Data exchange accepted" : "Data exchange already received",
        statusUrl: `/api/jobs/${job._id}`,
        ...toPublicJob(current),
        resolved: summarize(prepared),
      });
    } catch (error) {
      return sendExchangeError(res, next, error);
    }
  });

  // Shows what /run would record and pay, without writing anything.
  app.get("/api/dataexchanges/:dataExchangeId/preview", requireApiToken, async (req, res, next) => {
    try {
      return res.json(summarize(await resolveExchangeJob(req)));
    } catch (error) {
      return sendExchangeError(res, next, error);
    }
  });

  app.get("/api/jobs/:jobId", requireApiToken, async (req, res, next) => {
    try {
      const job = await store.get(req.params.jobId);
      if (!job) {
        return res.status(404).json({ error: "Job not found" });
      }
      return res.json(toPublicJob(job));
    } catch (error) {
      return next(error);
    }
  });

  app.use((req, res) => res.status(404).json({ error: "Not found" }));

  // eslint-disable-next-line no-unused-vars
  app.use((error, req, res, next) => {
    if (error.type === "entity.parse.failed") {
      return res.status(400).json({ error: "Malformed JSON body" });
    }
    if (error.type === "entity.too.large") {
      return res.status(413).json({ error: "Request body too large" });
    }
    logger.error(`Unhandled error: ${error.stack || error.message}`);
    return res.status(500).json({ error: "Internal server error" });
  });

  return app;
};

const main = async () => {
  const config = loadConfig();
  // Fail fast on a broken registry instead of on the first request.
  loadWalletRegistry(config.organizationsFile);

  const mongo = new MongoClient(config.mongodbUri);
  for (;;) {
    try {
      await mongo.connect();
      break;
    } catch (error) {
      logger.warn(`MongoDB connection failed, retrying in 5 seconds: ${error.message}`);
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }

  const store = await createJobStore(mongo.db());
  await store.recoverInterrupted();

  const coreApi = createCoreApiClient(config);
  const incentive = createIncentiveClient(config);
  const dataspace = createDataspaceClient({
    config: config.dataspace,
    safeFetch: createSafeFetcher({
      timeoutMs: config.dataspace.httpTimeoutMs,
      allowPrivateNetworks: config.dataspace.allowPrivateNetworks,
    }),
  });
  const worker = createWorker({ store, coreApi, incentive, dataspace, config, logger });
  worker.start();

  if (config.dataspace.enabled) {
    logger.info(`Data-exchange endpoint enabled for connectors: ${config.dataspace.connectorDomains.join(", ")}`);
  }

  const server = createApp({ config, store, worker, dataspace }).listen(config.port, () => {
    logger.info(`trace-api listening on port ${config.port}, operator wallet ${incentive.operatorAddress}`);
  });

  const shutdown = () => {
    worker.stop();
    server.close(() => mongo.close().finally(() => process.exit(0)));
  };
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    logger.error(`Startup failed: ${error.message}`);
    process.exit(1);
  });
}
