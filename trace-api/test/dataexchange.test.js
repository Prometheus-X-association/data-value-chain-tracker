import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { createApp } from "../src/server.js";
import { createWorker } from "../src/jobs.js";
import { loadWalletRegistry } from "../src/registry.js";
import { SourceError, createSafeFetcher, hostMatches, isPrivateAddress } from "../src/dataspace/http.js";
import {
  buildExchangeJob,
  createDataspaceClient,
  extractQueryParams,
  parseWeights,
  resolveDataExchange,
} from "../src/dataspace/exchange.js";
import { ValidationError } from "../src/validation.js";

// Fixtures are anonymized real responses of a three-participant service chain
// (hosts, names, session ids and catalog keys replaced).
const fixtures = path.join(path.dirname(fileURLToPath(import.meta.url)), "fixtures");
const load = (name) => JSON.parse(fs.readFileSync(path.join(fixtures, name), "utf8"));

const CONSUMER_DX = "4e39d0a95bd10781b97e6644";
const PROVIDER_DX = "1fe8e3f84dc443e1b472ea28";
const CHAIN = "32c09a520bca7915f542db7e";
const P = (id) => `https://catalog.example.org/v1/catalog/participants/${id}`;
const PARTICIPANT_A = P("4f0d35da82bf80117c855e8b");
const PARTICIPANT_B = P("ec0a6e8d9fb4c9e585310224");
const PARTICIPANT_C = P("8c0bc413f9be90e93fe691c0");
const WALLETS = {
  [PARTICIPANT_A]: "0xFABB0ac9d68B0B445fB7357272Ff202C5651694a",
  [PARTICIPANT_B]: "0x1CBd3b2770909D4e10f157cABC84C7264073C9Ec",
  [PARTICIPANT_C]: "0xdF3e18d64BC6A983f673Ab319CCaE4f1a57C7097",
};

const dataspaceConfig = {
  enabled: true,
  connectorDomains: ["connector-a.example.org", "*.connectors.example.org", "connector-c.example.org"],
  defaultConnector: "https://connector-c.example.org",
  catalogDomains: ["catalog.example.org"],
  contractDomains: ["contracts.example.org"],
  completionTimeoutSeconds: 60,
};

const registryFile = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "trace-api-dx-")), "organizations.json");
fs.writeFileSync(
  registryFile,
  JSON.stringify([
    { organizationId: PARTICIPANT_A, walletAddress: WALLETS[PARTICIPANT_A] },
    { organizationId: PARTICIPANT_B, walletAddress: WALLETS[PARTICIPANT_B] },
    { organizationId: PARTICIPANT_C, walletAddress: WALLETS[PARTICIPANT_C] },
  ]),
);
const registry = loadWalletRegistry(registryFile);

const withRewardParams = (exchange, extra) => {
  const copy = structuredClone(exchange);
  copy.content.purposes[0].params.query.push(...extra);
  return copy;
};

// Fake network: URL -> JSON document (or a function returning a Response-like object).
const createNetwork = (overrides = {}) => {
  const documents = {
    [`https://connector-c.example.org/dataexchanges/${CONSUMER_DX}`]: load("dataexchange-consumer.json"),
    [`https://connector-a.example.org/dataexchanges/${PROVIDER_DX}`]: load("dataexchange-provider.json"),
    "https://contracts.example.org/contracts/1ede4e4c2b10f3273181b36f": load("contract.json"),
    "https://catalog.example.org/v1/catalog/ecosystems/f26201fffe660c97d448c25b": load("ecosystem.json"),
    ...Object.fromEntries(Object.entries(load("participants.json")).map(([id, doc]) => [P(id), doc])),
    ...overrides,
  };
  const requested = [];
  const fetchImpl = async (url) => {
    requested.push(url);
    const document = documents[url];
    if (typeof document === "function") return document();
    if (document === undefined) return { status: 404, ok: false, headers: new Map(), text: async () => "{}" };
    const body = JSON.stringify(document);
    return { status: 200, ok: true, headers: new Map(), text: async () => body };
  };
  const lookup = async (host) => [{ address: host.startsWith("internal.") ? "10.0.0.5" : "93.184.216.34" }];
  return { client: createDataspaceClient({ safeFetch: createSafeFetcher({ fetchImpl, lookup }), config: dataspaceConfig }), requested };
};

const resolveConsumer = (client, connector = "https://connector-c.example.org") =>
  resolveDataExchange(client, { dataExchangeId: CONSUMER_DX, connector });

test("resolves the last service's data exchange into the service chain", async () => {
  const { client } = createNetwork();
  const resolved = await resolveConsumer(client);

  assert.equal(resolved.providerDataExchangeId, PROVIDER_DX);
  assert.equal(resolved.chainId, CHAIN);
  assert.equal(resolved.chainName, "Example chain");
  assert.equal(resolved.status, "IMPORT_SUCCESS");
  assert.equal(resolved.completed, true);
  assert.deepEqual(
    resolved.participants.map((participant) => participant.legalName),
    ["Participant A", "Participant B", "Participant C"],
  );
  assert.deepEqual(resolved.steps, [
    { index: 0, participant: PARTICIPANT_A, sources: [] },
    { index: 1, participant: PARTICIPANT_B, sources: [0] },
    { index: 2, participant: PARTICIPANT_C, sources: [1] },
  ]);
  assert.ok(!JSON.stringify(resolved).includes("FIXTURE-SECRET"), "catalog keys must never be kept");
});

test("both sides of the exchange resolve to the same provider-side id", async () => {
  const { client } = createNetwork();
  const fromProvider = await resolveDataExchange(client, {
    dataExchangeId: PROVIDER_DX,
    connector: "https://connector-a.example.org",
  });
  assert.equal(fromProvider.providerDataExchangeId, PROVIDER_DX);
});

test("without reward parameters only traceability is recorded", async () => {
  const { client } = createNetwork();
  const { plan, payload } = buildExchangeJob(await resolveConsumer(client), { registry, config: { maxRewardPool: 5000 } });

  assert.equal(plan, null);
  assert.equal(payload.reachEndFlow, false);
  assert.equal(payload.hops.length, 2);
  assert.equal(payload.nodes.length, 3);
  // Catalog names travel with every node (but never the catalog's keys).
  assert.deepEqual(payload.nodes[0].organizationNames, [
    { organizationId: PARTICIPANT_A, name: "Participant A" },
    { organizationId: PARTICIPANT_B, name: "Participant B" },
    { organizationId: PARTICIPANT_C, name: "Participant C" },
  ]);
  assert.ok(!JSON.stringify(payload).includes("FIXTURE-SECRET"));
  assert.equal(payload.useCaseId, CHAIN);
  assert.equal(payload.useCaseName, `${CHAIN}:${PROVIDER_DX}`);
});

for (const [format, weights] of [
  ["participantId:weight pairs", "4f0d35da82bf80117c855e8b:40,ec0a6e8d9fb4c9e585310224:35,8c0bc413f9be90e93fe691c0:25"],
  ["full participant URLs", `${PARTICIPANT_A}:40,${PARTICIPANT_B}:35,${PARTICIPANT_C}:25`],
  ["positional weights", "40,35,25"],
]) {
  test(`reads reward pool and weights from the exchange query params (${format})`, async () => {
    const exchange = withRewardParams(load("dataexchange-consumer.json"), [
      { dvctRewardPool: "1000" },
      { dvctWeights: weights },
    ]);
    const { client } = createNetwork({ [`https://connector-c.example.org/dataexchanges/${CONSUMER_DX}`]: exchange });
    const { plan, payload } = buildExchangeJob(await resolveConsumer(client), { registry, config: { maxRewardPool: 5000 } });

    assert.equal(plan.rewardPool, "1000");
    assert.deepEqual(
      plan.participants.map((entry) => [entry.walletAddress, entry.basisPoints]),
      [
        [WALLETS[PARTICIPANT_A], 4000],
        [WALLETS[PARTICIPANT_B], 3500],
        [WALLETS[PARTICIPANT_C], 2500],
      ],
    );
    assert.equal(payload.reachEndFlow, true);
    assert.equal(payload.useCaseDisplayName, "Example chain");
  });
}

test("rejects invalid reward parameters before anything is written", async () => {
  const participants = [PARTICIPANT_A, PARTICIPANT_B, PARTICIPANT_C];
  assert.throws(() => parseWeights("40,35", participants), /3 chain participants/);
  assert.throws(() => parseWeights("ffffffffffffffffffffffff:10", participants), /not part of this service chain/);
  assert.throws(() => parseWeights("4f0d35da82bf80117c855e8b:-1", participants), ValidationError);
  assert.throws(() => parseWeights("4f0d35da82bf80117c855e8b", participants), ValidationError);

  const resolved = { params: new Map([["dvctRewardPool", "10"]]), participants: [], hops: [] };
  assert.throws(() => buildExchangeJob(resolved, { registry, config: {} }), /must be set together/);

  const exchange = load("dataexchange-consumer.json").content;
  exchange.serviceChainParams[0].params.query.push({ dvctRewardPool: "1" });
  exchange.purposes[0].params.query.push({ dvctRewardPool: "2" });
  assert.throws(() => extractQueryParams(exchange), /conflicting values/);
});

test("pays only weighted participants and requires their wallets", async () => {
  const sparseRegistry = loadWalletRegistry(
    (() => {
      const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "trace-api-dx-")), "o.json");
      fs.writeFileSync(file, JSON.stringify([{ organizationId: PARTICIPANT_C, walletAddress: WALLETS[PARTICIPANT_C] }]));
      return file;
    })(),
  );
  const build = async (weights) => {
    const exchange = withRewardParams(load("dataexchange-consumer.json"), [
      { dvctRewardPool: "100" },
      { dvctWeights: weights },
    ]);
    const { client } = createNetwork({ [`https://connector-c.example.org/dataexchanges/${CONSUMER_DX}`]: exchange });
    return buildExchangeJob(await resolveConsumer(client), { registry: sparseRegistry, config: { maxRewardPool: 5000 } });
  };

  const { plan } = await build("8c0bc413f9be90e93fe691c0:1");
  assert.deepEqual(plan.participants.map((entry) => entry.walletAddress), [WALLETS[PARTICIPANT_C]]);
  await assert.rejects(build("4f0d35da82bf80117c855e8b:1"), /No wallet address registered/);
});

test("checks the exchange against the signed contract", async () => {
  const exchangeUrl = `https://connector-c.example.org/dataexchanges/${CONSUMER_DX}`;
  const contractUrl = "https://contracts.example.org/contracts/1ede4e4c2b10f3273181b36f";
  const cases = [
    [{ [contractUrl]: { ...load("contract.json"), status: "pending" } }, /not signed/],
    [{ [contractUrl]: { ...load("contract.json"), serviceChains: [] } }, /not part of contract/],
    [{ [contractUrl]: { ...load("contract.json"), members: [] , orchestrator: null } }, /not a signed member/],
    [
      (() => {
        const exchange = load("dataexchange-consumer.json");
        exchange.content.status = "CONSUMER_IMPORT_ERROR";
        return { [exchangeUrl]: exchange };
      })(),
      /has status CONSUMER_IMPORT_ERROR/,
    ],
  ];
  for (const [overrides, expected] of cases) {
    const { client } = createNetwork(overrides);
    await assert.rejects(resolveConsumer(client), expected);
  }
  await assert.rejects(resolveDataExchange(createNetwork().client, { dataExchangeId: "../admin", connector: "x" }), ValidationError);
});

test("accepts the contract manager's signature states and excludes revoked members", async () => {
  const contractUrl = "https://contracts.example.org/contracts/1ede4e4c2b10f3273181b36f";
  const withSignature = (signature, extra = {}) => {
    const contract = load("contract.json");
    contract.members = contract.members.map((member) => ({ ...member, signature }));
    return { [contractUrl]: { ...contract, ...extra } };
  };

  await resolveConsumer(createNetwork(withSignature("hasSigned")).client);
  await assert.rejects(resolveConsumer(createNetwork(withSignature("pending")).client), /not a signed member/);
  await assert.rejects(
    resolveConsumer(createNetwork(withSignature("signed", { revokedMembers: [{ participant: PARTICIPANT_B }] })).client),
    new RegExp(`${PARTICIPANT_B} is not a signed member`),
  );
});

test("a chain that visits a participant twice stays a path in the graph", async () => {
  // A -> B -> A: the first participant is also the last service of the chain.
  const exchange = withRewardParams(load("dataexchange-consumer.json"), [
    { dvctRewardPool: "100" },
    { dvctWeights: "60,40" },
  ]);
  exchange.content.serviceChain.services[2].participant = PARTICIPANT_A;
  const { client } = createNetwork({ [`https://connector-c.example.org/dataexchanges/${CONSUMER_DX}`]: exchange });
  const resolved = await resolveConsumer(client);
  const { payload, plan } = buildExchangeJob(resolved, { registry, config: { maxRewardPool: 5000 } });

  assert.deepEqual(resolved.participants.map((participant) => participant.url), [PARTICIPANT_A, PARTICIPANT_B]);
  const keys = payload.nodes.map((node) => `trace-node:${node.usecaseContractId}:${node.dataId}:${node.participantId}`);
  assert.equal(new Set(keys).size, 3, "every step gets its own node");
  assert.deepEqual(payload.nodes.map((node) => node.prevDataId), [[], [keys[0]], [keys[1]]]);
  assert.deepEqual(plan.participants.map((entry) => [entry.walletAddress, entry.basisPoints]), [
    [WALLETS[PARTICIPANT_A], 6000],
    [WALLETS[PARTICIPANT_B], 4000],
  ]);
});

test("never fetches from hosts outside the allowlists", async () => {
  const { client, requested } = createNetwork();
  await assert.rejects(resolveConsumer(client, "https://evil.example"), SourceError);
  await assert.rejects(resolveConsumer(client, "http://connector-c.example.org"), /only plain https/);
  await assert.rejects(resolveConsumer(client, "https://internal.connectors.example.org"), /resolves to a private address/);

  // A tampered exchange record cannot redirect us to another contract server.
  const exchange = load("dataexchange-consumer.json");
  exchange.content.contract = "https://attacker.example/contracts/1";
  const tampered = createNetwork({ [`https://connector-c.example.org/dataexchanges/${CONSUMER_DX}`]: exchange });
  await assert.rejects(resolveConsumer(tampered.client), /not in the configured allowlist/);
  assert.ok(!tampered.requested.some((url) => url.includes("attacker")));
  assert.ok(!requested.some((url) => url.includes("evil")));

  const redirect = createNetwork({
    [`https://connector-c.example.org/dataexchanges/${CONSUMER_DX}`]: () => ({ status: 302, ok: false, headers: new Map() }),
  });
  await assert.rejects(resolveConsumer(redirect.client), /redirect/);

  assert.equal(hostMatches("a.connectors.example.org", ["*.connectors.example.org"]), true);
  assert.equal(hostMatches("connectors.example.org", ["*.connectors.example.org"]), false);
  assert.equal(hostMatches("evilconnectors.example.org", ["*.connectors.example.org"]), false);
  for (const address of ["127.0.0.1", "10.1.2.3", "172.20.0.1", "192.168.1.1", "169.254.169.254", "::1", "fd00::1", "::ffff:10.0.0.1"]) {
    assert.equal(isPrivateAddress(address), true, address);
  }
  assert.equal(isPrivateAddress("93.184.216.34"), false);
});

// --- HTTP endpoint and job pipeline ---

const TOKEN = "t".repeat(40);

const createMemoryStore = () => {
  const jobs = new Map();
  return {
    jobs,
    async enqueue({ payload, idempotencyKey, plan }) {
      const existing = [...jobs.values()].find((job) => job.idempotencyKey === idempotencyKey);
      if (existing) return { job: existing, created: false };
      const now = new Date();
      const job = {
        _id: `job-${jobs.size + 1}`, idempotencyKey, status: "queued", step: "trace", payload,
        result: { plan }, attempts: 0, createdAt: now, updatedAt: now, nextRunAt: now,
      };
      jobs.set(job._id, job);
      return { job, created: true };
    },
    get: async (id) => jobs.get(id) || null,
    async claimNext() {
      const due = [...jobs.values()].find(
        (job) => ["queued", "waiting"].includes(job.status) && job.nextRunAt <= new Date(),
      );
      if (due) due.status = "running";
      return due ? structuredClone(due) : null;
    },
    async update(id, fields) {
      Object.assign(jobs.get(id), structuredClone(fields), { updatedAt: new Date() });
    },
    findOtherPayoutForUseCase: async () => null,
  };
};

const appConfig = {
  apiToken: TOKEN,
  organizationsFile: registryFile,
  defaultRewardPool: "1000",
  maxRewardPool: 5000,
  lockSeconds: 60,
  dataspace: dataspaceConfig,
};

const withServer = async (overrides, callback, configOverride = {}) => {
  const store = createMemoryStore();
  const { client } = createNetwork(overrides);
  const server = createApp({
    config: { ...appConfig, ...configOverride },
    store,
    worker: { wake() {} },
    dataspace: client,
  }).listen(0);
  const base = `http://127.0.0.1:${server.address().port}`;
  const call = (method, url) =>
    fetch(`${base}${url}`, { method, headers: { Authorization: `Bearer ${TOKEN}` } });
  try {
    await callback({ call, store, base });
  } finally {
    server.close();
  }
};

test("preview shows the resolved chain and payout without creating a job", async () => {
  const exchange = withRewardParams(load("dataexchange-consumer.json"), [
    { dvctRewardPool: "300" },
    { dvctWeights: "40,35,25" },
  ]);
  await withServer({ [`https://connector-c.example.org/dataexchanges/${CONSUMER_DX}`]: exchange }, async ({ call, store }) => {
    const response = await call("GET", `/api/dataexchanges/${CONSUMER_DX}/preview`);
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.serviceChain.name, "Example chain");
    assert.equal(body.payout.onChainUseCaseId, `${CHAIN}:${PROVIDER_DX}`);
    assert.deepEqual(body.payout.shares.map((share) => share.basisPoints), [4000, 3500, 2500]);
    assert.equal(store.jobs.size, 0);
  });
});

test("run accepts the exchange once, from either side", async () => {
  await withServer({}, async ({ call, store }) => {
    const first = await call("POST", `/api/dataexchanges/${CONSUMER_DX}/run`);
    assert.equal(first.status, 202);
    const body = await first.json();
    assert.equal(body.dataExchange.providerId, PROVIDER_DX);

    const again = await call("POST", `/api/dataexchanges/${PROVIDER_DX}/run?connector=https://connector-a.example.org`);
    assert.equal(again.status, 200);
    assert.equal((await again.json()).jobId, body.jobId);
    assert.equal(store.jobs.size, 1);
  });
});

test("run reports configuration, validation and upstream errors", async () => {
  await withServer({}, async ({ call }) => {
    assert.equal((await call("POST", "/api/dataexchanges/not-an-id/run")).status, 400);
    assert.equal((await call("POST", `/api/dataexchanges/${CONSUMER_DX}/run?connector=https://evil.example`)).status, 502);
    assert.equal((await call("POST", "/api/dataexchanges/ffffffffffffffffffffffff/run")).status, 502);
  });
  await withServer({}, async ({ call }) => {
    assert.equal((await call("POST", `/api/dataexchanges/${CONSUMER_DX}/run`)).status, 503);
  }, { dataspace: { ...dataspaceConfig, enabled: false } });
  await withServer({}, async ({ base }) => {
    assert.equal((await fetch(`${base}/api/dataexchanges/${CONSUMER_DX}/run`, { method: "POST" })).status, 401);
  });
});

test("the job records every hop, waits for completion, then settles the payout", async () => {
  const exchangeUrl = `https://connector-c.example.org/dataexchanges/${CONSUMER_DX}`;
  const running = withRewardParams(load("dataexchange-consumer.json"), [
    { dvctRewardPool: "300" },
    { dvctWeights: "40,35,25" },
  ]);
  running.content.status = "PENDING";
  running.content.serviceChain.services[2].completed = false;
  const network = { [exchangeUrl]: running };

  const store = createMemoryStore();
  const posted = [];
  const coreApi = {
    nodeExists: async (key) => posted.some((payload) => `trace-node:${payload.usecaseContractId}:${payload.dataId}:${payload.participantId}` === key),
    postNode: async (payload) => {
      posted.push(payload);
      return { data: { canonicalKey: `trace-node:${payload.usecaseContractId}:${payload.dataId}:${payload.participantId}` } };
    },
    saveUseCaseMetadata: async (metadata) => {
      store.metadata = metadata;
    },
  };
  const calls = [];
  const incentive = {
    ensureUseCase: async (id) => calls.push(["ensureUseCase", id]),
    setShares: async (id, plan) => calls.push(["setShares", plan.map((entry) => entry.basisPoints)]),
    deposit: async () => "0xdeposit",
    lock: async () => 1,
    distribute: async () => ({ payouts: [{ walletAddress: WALLETS[PARTICIPANT_B], amount: "105.0" }], transactionHash: "0xdist" }),
  };
  const logger = { info() {}, warn() {}, error() {} };

  const { client } = createNetwork(network);
  const resolved = await resolveConsumer(client);
  const { payload, plan } = buildExchangeJob(resolved, { registry, config: { maxRewardPool: 5000 } });
  const { job } = await store.enqueue({ payload, plan, idempotencyKey: "k" });

  const worker = createWorker({ store, coreApi, incentive, dataspace: client, config: appConfig, logger });
  await worker.runPending();

  let current = store.jobs.get(job._id);
  assert.equal(current.status, "waiting");
  assert.equal(current.step, "awaitExchange");
  // One node per chain step, each linked to the previous step.
  assert.deepEqual(posted.map((node) => node.participantId), [PARTICIPANT_A, PARTICIPANT_B, PARTICIPANT_C]);
  assert.deepEqual(posted[0].prevDataId, []);
  assert.deepEqual(posted[2].prevDataId, [`trace-node:${CHAIN}:${PROVIDER_DX}/step-1:${PARTICIPANT_B}`]);
  assert.equal(calls.length, 0, "no payout before the exchange is complete");

  running.content.status = "IMPORT_SUCCESS";
  running.content.serviceChain.services[2].completed = true;
  current.nextRunAt = new Date(0);
  await worker.runPending();

  current = store.jobs.get(job._id);
  assert.equal(current.status, "succeeded");
  assert.deepEqual(calls, [
    ["ensureUseCase", `${CHAIN}:${PROVIDER_DX}`],
    ["setShares", [4000, 3500, 2500]],
  ]);
  assert.equal(store.metadata.useCaseName, "Example chain");
  assert.equal(current.result.distributeTx, "0xdist");
});
