import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

const required = (name, minLength = 1) => {
  const value = process.env[name] || "";
  if (value.length < minLength) {
    throw new Error(`${name} must be set${minLength > 1 ? ` (at least ${minLength} characters)` : ""}. Run "make init".`);
  }
  return value;
};

const readDeployment = (deploymentFile) => {
  const deployment = JSON.parse(fs.readFileSync(deploymentFile, "utf8"));
  if (!deployment.PTX_TOKEN_ADDRESS || !deployment.USECASE_CONTRACT_ADDRESS) {
    throw new Error(`${deploymentFile} must contain PTX_TOKEN_ADDRESS and USECASE_CONTRACT_ADDRESS`);
  }
  return deployment;
};

export const loadConfig = () => {
  const deploymentFile =
    process.env.INCENTIVE_DEPLOYMENT_FILE || path.join(repoRoot, "incentive/api/src/config/deployment.json");
  const deployment = readDeployment(deploymentFile);
  const lockSeconds = Number(process.env.INCENTIVE_LOCK_SECONDS || 60);

  if (!Number.isInteger(lockSeconds) || lockSeconds < 60 || lockSeconds > 365 * 24 * 3600) {
    throw new Error("INCENTIVE_LOCK_SECONDS must be an integer between 60 and 31536000");
  }

  return {
    port: Number(process.env.PORT || 9091),
    mongodbUri: required("MONGODB_URI"),
    apiToken: required("TRACE_API_TOKEN", 32),
    coreApiUrl: (process.env.CORE_API_URL || "http://localhost:9081").replace(/\/+$/, ""),
    internalApiToken: required("DVCT_INTERNAL_API_TOKEN", 32),
    organizationsFile: process.env.DVCT_ORGANIZATIONS_FILE || path.join(repoRoot, "config/organizations.json"),
    rpcUrl: process.env.INCENTIVE_RPC_URL || "http://127.0.0.1:8545",
    incentiveApiUrl: required("INCENTIVE_API_URL").replace(/\/+$/, ""),
    incentiveApiHmacSecret: required("INCENTIVE_API_HMAC_SECRET", 32),
    operatorPrivateKey: required("TRACE_OPERATOR_PRIVATE_KEY", 66),
    tokenAddress: deployment.PTX_TOKEN_ADDRESS,
    useCaseAddress: deployment.USECASE_CONTRACT_ADDRESS,
    lockSeconds,
    defaultRewardPool: process.env.INCENTIVE_DEFAULT_REWARD_POOL || "1000",
    maxRewardPool: Number(process.env.INCENTIVE_MAX_REWARD_POOL || 1_000_000),
    dataspace: loadDataspaceConfig(),
  };
};

const parseList = (value) =>
  String(value || "")
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);

// Data-exchange endpoint: which connectors, catalogs and contract managers may be queried.
// Exact host names or "*.domain" wildcards. There are no built-in hosts: the endpoint stays
// disabled until all three lists are configured.
export const loadDataspaceConfig = () => {
  const completionTimeoutSeconds = Number(process.env.DATAEXCHANGE_COMPLETION_TIMEOUT_SECONDS || 1800);
  if (!Number.isInteger(completionTimeoutSeconds) || completionTimeoutSeconds < 0) {
    throw new Error("DATAEXCHANGE_COMPLETION_TIMEOUT_SECONDS must be a non-negative integer");
  }

  const defaultConnector = String(process.env.PDC_DEFAULT_CONNECTOR || "").replace(/\/+$/, "");
  if (defaultConnector && !defaultConnector.startsWith("https://")) {
    throw new Error("PDC_DEFAULT_CONNECTOR must be an https URL");
  }

  const connectorDomains = parseList(process.env.PDC_CONNECTOR_DOMAINS);
  const catalogDomains = parseList(process.env.CATALOG_API_DOMAINS);
  const contractDomains = parseList(process.env.CONTRACT_API_DOMAINS);

  return {
    enabled: connectorDomains.length > 0 && catalogDomains.length > 0 && contractDomains.length > 0,
    connectorDomains,
    defaultConnector,
    catalogDomains,
    contractDomains,
    completionTimeoutSeconds,
    httpTimeoutMs: Number(process.env.DATASPACE_HTTP_TIMEOUT_MS || 10_000),
    // Only for local testing against a connector on a private network.
    allowPrivateNetworks: process.env.DATASPACE_ALLOW_PRIVATE_NETWORKS === "true",
  };
};
