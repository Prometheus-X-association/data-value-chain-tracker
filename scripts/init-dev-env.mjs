#!/usr/bin/env node
// Generates the local secrets of a DVCT demonstrator installation:
//   .env                               service tokens, database password, service wallet keys
//   config/organizations.json          organization registry with hashed login passwords
//   config/dev-credentials.local.txt   the generated login passwords (keep private)
// All three files are gitignored. Re-run with --force to regenerate everything.
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const force = process.argv.includes("--force");
const envPath = path.join(root, ".env");
const registryExamplePath = path.join(root, "config/organizations.example.json");
const registryPath = path.join(root, "config/organizations.json");
const credentialsPath = path.join(root, "config/dev-credentials.local.txt");

// --- Keccak-256 (Ethereum flavour of SHA-3), needed to derive wallet addresses ---
const ROUND_CONSTANTS = [
  0x0000000000000001n, 0x0000000000008082n, 0x800000000000808an, 0x8000000080008000n,
  0x000000000000808bn, 0x0000000080000001n, 0x8000000080008081n, 0x8000000000008009n,
  0x000000000000008an, 0x0000000000000088n, 0x0000000080008009n, 0x000000008000000an,
  0x000000008000808bn, 0x800000000000008bn, 0x8000000000008089n, 0x8000000000008003n,
  0x8000000000008002n, 0x8000000000000080n, 0x000000000000800an, 0x800000008000000an,
  0x8000000080008081n, 0x8000000000008080n, 0x0000000080000001n, 0x8000000080008008n,
];
const ROTATIONS = [0, 1, 62, 28, 27, 36, 44, 6, 55, 20, 3, 10, 43, 25, 39, 41, 45, 15, 21, 8, 18, 2, 61, 56, 14];
const MASK = (1n << 64n) - 1n;
const rotl = (value, shift) => (shift === 0 ? value : ((value << BigInt(shift)) | (value >> BigInt(64 - shift))) & MASK);

function keccakF(state) {
  for (const roundConstant of ROUND_CONSTANTS) {
    const c = [0, 1, 2, 3, 4].map((x) => state[x] ^ state[x + 5] ^ state[x + 10] ^ state[x + 15] ^ state[x + 20]);
    for (let x = 0; x < 5; x++) {
      const d = c[(x + 4) % 5] ^ rotl(c[(x + 1) % 5], 1);
      for (let y = 0; y < 25; y += 5) state[x + y] ^= d;
    }
    const b = new Array(25);
    for (let x = 0; x < 5; x++) {
      for (let y = 0; y < 5; y++) b[y + 5 * ((2 * x + 3 * y) % 5)] = rotl(state[x + 5 * y], ROTATIONS[x + 5 * y]);
    }
    for (let x = 0; x < 5; x++) {
      for (let y = 0; y < 25; y += 5) state[x + y] = b[x + y] ^ (~b[(x + 1) % 5 + y] & MASK & b[(x + 2) % 5 + y]);
    }
    state[0] ^= roundConstant;
  }
}

function keccak256(data) {
  const rate = 136;
  const padded = Buffer.alloc(Math.ceil((data.length + 1) / rate) * rate);
  data.copy(padded);
  padded[data.length] ^= 0x01;
  padded[padded.length - 1] ^= 0x80;
  const state = new Array(25).fill(0n);
  for (let offset = 0; offset < padded.length; offset += rate) {
    for (let i = 0; i < rate / 8; i++) state[i] ^= padded.readBigUInt64LE(offset + i * 8);
    keccakF(state);
  }
  const out = Buffer.alloc(32);
  for (let i = 0; i < 4; i++) out.writeBigUInt64LE(state[i], i * 8);
  return out;
}

function addressFromPrivateKey(privateKeyHex) {
  const ecdh = crypto.createECDH("secp256k1");
  ecdh.setPrivateKey(Buffer.from(privateKeyHex.slice(2), "hex"));
  const lower = keccak256(ecdh.getPublicKey().subarray(1)).subarray(12).toString("hex");
  const checksumHash = keccak256(Buffer.from(lower, "ascii")).toString("hex");
  return "0x" + [...lower].map((ch, i) => (parseInt(checksumHash[i], 16) >= 8 ? ch.toUpperCase() : ch)).join("");
}

// Self-check against a well-known test vector (Hardhat/Anvil account #0).
if (
  addressFromPrivateKey("0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80") !==
  "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
) {
  throw new Error("Address derivation self-check failed");
}

const randomToken = () => crypto.randomBytes(32).toString("hex");
const randomPassword = () => crypto.randomBytes(15).toString("base64url");
const randomPrivateKey = () => "0x" + crypto.randomBytes(32).toString("hex");

function hashPassword(password) {
  const N = 16384, r = 8, p = 1;
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, 32, { N, r, p });
  return `scrypt$${N}$${r}$${p}$${salt.toString("base64")}$${hash.toString("base64")}`;
}

// --sync-organizations: add organizations of the template that are missing from
// config/organizations.json (with new passwords for their users). Leaves .env untouched.
if (process.argv.includes("--sync-organizations")) {
  if (!fs.existsSync(registryPath)) {
    console.error("config/organizations.json does not exist yet: run make init first.");
    process.exit(1);
  }
  const current = JSON.parse(fs.readFileSync(registryPath, "utf8"));
  const known = new Set(current.map((organization) => organization.organizationId));
  const added = [];
  let addedOrganizations = 0;
  for (const organization of JSON.parse(fs.readFileSync(registryExamplePath, "utf8"))) {
    if (known.has(organization.organizationId)) continue;
    addedOrganizations += 1;
    for (const user of organization.users || []) {
      const password = randomPassword();
      user.passwordHash = hashPassword(password);
      added.push(`${user.username}\t${password}\t${organization.organizationId}`);
    }
    current.push(organization);
    known.add(organization.organizationId);
  }
  fs.writeFileSync(registryPath, JSON.stringify(current, null, 2) + "\n");
  if (added.length > 0) {
    fs.appendFileSync(credentialsPath, added.join("\n") + "\n", { mode: 0o600 });
  }
  console.log(`Added ${addedOrganizations} organization(s) and ${added.length} user(s).`);
  if (addedOrganizations > 0) {
    console.log("New passwords were appended to config/dev-credentials.local.txt. Restart core-api and trace-api.");
  }
  process.exit(0);
}

for (const target of [envPath, registryPath]) {
  if (fs.existsSync(target) && !force) {
    console.error(`${path.relative(root, target)} already exists. Re-run with --force to regenerate all secrets.`);
    process.exit(1);
  }
}

const relayerKey = randomPrivateKey();
const operatorKey = randomPrivateKey();

const env = `# Generated by scripts/init-dev-env.mjs - never commit this file.
MONGO_ROOT_USERNAME=dvct
MONGO_ROOT_PASSWORD=${randomToken()}

# core-api <-> trace-api service token
DVCT_INTERNAL_API_TOKEN=${randomToken()}
# Bearer token the PDC / workflow engine uses to call POST /api/run-script
TRACE_API_TOKEN=${randomToken()}
# Shared secret used to sign requests from trace-api to incentive-api
INCENTIVE_API_HMAC_SECRET=${randomToken()}

# Incentive API relayer wallet (submits permit deposits, holds RELAYER_ROLE)
INCENTIVE_API_PRIVATE_KEY=${relayerKey}
INCENTIVE_RELAYER_ADDRESS=${addressFromPrivateKey(relayerKey)}
# trace-api operator wallet (owns the use cases it creates and funds their reward pools)
TRACE_OPERATOR_PRIVATE_KEY=${operatorKey}
TRACE_OPERATOR_ADDRESS=${addressFromPrivateKey(operatorKey)}

# Set to true when the gateway is served over HTTPS
DVCT_SESSION_SECURE=false
# Comma-separated extra browser origins allowed to call the core API (same-origin needs none)
DVCT_CORS_ORIGINS=
# Lock period (seconds) applied to rewards before they are distributed (contract minimum: 60)
INCENTIVE_LOCK_SECONDS=60
# Host port of the gateway
PUBLIC_PORT=3000

# Data-exchange endpoint (POST /trace-api/api/dataexchanges/{id}/run)
# Connector, catalog and contract hosts that may be queried (exact hosts or *.domain wildcards).
# All three must be set to enable the endpoint.
# Example: PDC_CONNECTOR_DOMAINS=connector.example.org,*.connectors.example.org
PDC_CONNECTOR_DOMAINS=
# Example: PDC_DEFAULT_CONNECTOR=https://connector.example.org
PDC_DEFAULT_CONNECTOR=
# Example: CATALOG_API_DOMAINS=catalog.example.org
CATALOG_API_DOMAINS=
# Example: CONTRACT_API_DOMAINS=contracts.example.org
CONTRACT_API_DOMAINS=
# How long a payout waits for the exchange to reach IMPORT_SUCCESS
DATAEXCHANGE_COMPLETION_TIMEOUT_SECONDS=1800
# Optional: catalog id(s) of the DVCT service offering (hidden from the traceability graph)
DVCT_SERVICE_OFFERINGS=
# Upper bound for dvctRewardPool / rewardPool (PTX)
INCENTIVE_MAX_REWARD_POOL=1000000
`;

const organizations = JSON.parse(fs.readFileSync(registryExamplePath, "utf8"));
const credentials = [];
for (const organization of organizations) {
  for (const user of organization.users || []) {
    const password = randomPassword();
    user.passwordHash = hashPassword(password);
    credentials.push(`${user.username}\t${password}\t${organization.organizationId}`);
  }
}

fs.writeFileSync(envPath, env, { mode: 0o600 });
fs.writeFileSync(registryPath, JSON.stringify(organizations, null, 2) + "\n", { mode: 0o644 });
fs.writeFileSync(
  credentialsPath,
  "# username\tpassword\torganizationId  (generated by scripts/init-dev-env.mjs - keep private)\n" +
    credentials.join("\n") + "\n",
  { mode: 0o600 },
);

console.log("Wrote .env, config/organizations.json and config/dev-credentials.local.txt");
console.log(`Login credentials for ${credentials.length} demo users are in config/dev-credentials.local.txt`);
