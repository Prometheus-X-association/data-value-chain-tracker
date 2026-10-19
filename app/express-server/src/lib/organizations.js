const fs = require('fs');
const path = require('path');

// The organization registry is shared with the trace-api. Each organization has one primary
// identifier, optional aliases (e.g. its connector URL and its catalog participant URL), a wallet
// address and the users that may sign in on its behalf. It never contains private keys.
const DEFAULT_REGISTRY_FILE = path.resolve(__dirname, '../../../../config/organizations.json');

let cachedRegistry = null;

const normalize = (value) => (typeof value === 'string' ? value.trim() : '');

const parseRegistry = (raw, source) => {
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new Error(`Organization registry ${source} is not valid JSON`);
  }

  if (!Array.isArray(parsed)) {
    throw new Error(`Organization registry ${source} must be a JSON array`);
  }

  const identifierOwners = new Map();
  const usersByName = new Map();

  const organizations = parsed.map((entry, index) => {
    const organizationId = normalize(entry?.organizationId);
    if (!organizationId) {
      throw new Error(`Organization registry entry #${index} has no organizationId`);
    }

    const identifiers = [organizationId, ...(Array.isArray(entry.aliases) ? entry.aliases : [])]
      .map(normalize)
      .filter(Boolean);

    identifiers.forEach((identifier) => {
      if (identifierOwners.has(identifier)) {
        throw new Error(`Organization identifier "${identifier}" is listed twice in the registry`);
      }
      identifierOwners.set(identifier, organizationId);
    });

    const organization = {
      organizationId,
      displayName: normalize(entry.displayName) || organizationId,
      identifiers,
      walletAddress: normalize(entry.walletAddress) || null,
    };

    (Array.isArray(entry.users) ? entry.users : []).forEach((user) => {
      const username = normalize(user?.username);
      const passwordHash = normalize(user?.passwordHash);
      if (!username) {
        return;
      }
      if (!passwordHash.startsWith('scrypt$')) {
        throw new Error(
          `User "${username}" has no scrypt passwordHash. Run "make init" or "npm run hash-password".`,
        );
      }
      if (usersByName.has(username)) {
        throw new Error(`Username "${username}" is listed twice in the registry`);
      }
      usersByName.set(username, { username, passwordHash, organization });
    });

    return organization;
  });

  return { organizations, usersByName };
};

const loadRegistry = () => {
  if (cachedRegistry) {
    return cachedRegistry;
  }

  if (process.env.DVCT_ORGANIZATIONS_JSON) {
    cachedRegistry = parseRegistry(process.env.DVCT_ORGANIZATIONS_JSON, 'DVCT_ORGANIZATIONS_JSON');
    return cachedRegistry;
  }

  const registryFile = process.env.DVCT_ORGANIZATIONS_FILE || DEFAULT_REGISTRY_FILE;
  if (!fs.existsSync(registryFile)) {
    throw new Error(`Organization registry not found at ${registryFile}. Run "make init" first.`);
  }

  cachedRegistry = parseRegistry(fs.readFileSync(registryFile, 'utf8'), registryFile);
  return cachedRegistry;
};

const findUser = (username) => loadRegistry().usersByName.get(normalize(username)) || null;

// Display name of the organization an identifier (organizationId or alias) belongs to, if registered.
const findDisplayName = (identifier) => {
  const registry = loadRegistry();
  if (!registry.nameByIdentifier) {
    // Organizations without an explicit displayName fall back to their id: those have no name.
    registry.nameByIdentifier = new Map(
      registry.organizations
        .filter((organization) => organization.displayName !== organization.organizationId)
        .flatMap((organization) => organization.identifiers.map((id) => [id, organization.displayName])),
    );
  }
  return registry.nameByIdentifier.get(normalize(identifier)) || null;
};

// Only for tests.
const resetRegistryCache = () => {
  cachedRegistry = null;
};

module.exports = {
  findDisplayName,
  findUser,
  loadRegistry,
  resetRegistryCache,
};
