import fs from "node:fs";
import { getAddress } from "ethers";

// Reads the shared organization registry (config/organizations.json). Only wallet *addresses*
// are used: payouts are pushed on-chain to these addresses, no participant key is ever needed.
export const loadWalletRegistry = (registryFile) => {
  const entries = JSON.parse(fs.readFileSync(registryFile, "utf8"));
  if (!Array.isArray(entries)) {
    throw new Error(`Organization registry ${registryFile} must be a JSON array`);
  }

  const byIdentifier = new Map();
  for (const entry of entries) {
    const organizationId = String(entry?.organizationId || "").trim();
    if (!organizationId) {
      throw new Error("Organization registry entry without organizationId");
    }

    let walletAddress = null;
    if (entry.walletAddress) {
      try {
        walletAddress = getAddress(String(entry.walletAddress).trim());
      } catch {
        throw new Error(`Organization ${organizationId} has an invalid walletAddress`);
      }
    }

    const record = { organizationId, displayName: entry.displayName || organizationId, walletAddress };
    for (const identifier of [organizationId, ...(entry.aliases || [])].map((id) => String(id).trim())) {
      if (!identifier) continue;
      if (byIdentifier.has(identifier)) {
        throw new Error(`Organization identifier "${identifier}" is listed twice in the registry`);
      }
      byIdentifier.set(identifier, record);
    }
  }

  return {
    resolve: (identifier) => byIdentifier.get(String(identifier || "").trim()) || null,
  };
};
