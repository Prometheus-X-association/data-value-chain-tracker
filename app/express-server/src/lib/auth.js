const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const parseEnvValue = (value = '') => {
  const trimmed = value.trim();

  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }

  return trimmed;
};

const loadLocalEnv = () => {
  const envFilePath = path.resolve(__dirname, '../../.env');

  if (!fs.existsSync(envFilePath)) {
    return;
  }

  const envContents = fs.readFileSync(envFilePath, 'utf8');

  envContents.split(/\r?\n/).forEach((line) => {
    const trimmedLine = line.trim();

    if (!trimmedLine || trimmedLine.startsWith('#')) {
      return;
    }

    const separatorIndex = trimmedLine.indexOf('=');

    if (separatorIndex === -1) {
      return;
    }

    const key = trimmedLine.slice(0, separatorIndex).trim();
    const value = parseEnvValue(trimmedLine.slice(separatorIndex + 1));

    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  });
};

loadLocalEnv();

const SESSION_COOKIE_NAME = process.env.DVCT_SESSION_COOKIE_NAME || 'dvct_session';
const SESSION_TTL_MS = Number(process.env.DVCT_SESSION_TTL_MS || 1000 * 60 * 60 * 8);
const COOKIE_SAME_SITE = process.env.DVCT_SESSION_SAME_SITE || 'Lax';
const COOKIE_SECURE = process.env.DVCT_SESSION_SECURE === 'true';
const INTERNAL_API_TOKEN = process.env.DVCT_INTERNAL_API_TOKEN || '';
const sessionStore = new Map();

const safeEqual = (left = '', right = '') => {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
};

const getConfiguredUsers = () => {
  const configuredUsers = process.env.DVCT_AUTH_USERS_JSON;

  if (!configuredUsers) {
    return [];
  }

  try {
    const parsedUsers = JSON.parse(configuredUsers);

    if (!Array.isArray(parsedUsers)) {
      return [];
    }

    return parsedUsers.filter(
      (user) => user?.username && user?.password && user?.organizationId,
    );
  } catch (error) {
    return [];
  }
};

const authenticateCredentials = (username = '', password = '') => {
  const user = getConfiguredUsers().find(
    (candidate) =>
      safeEqual(candidate.username, username) &&
      safeEqual(candidate.password, password),
  );

  if (!user) {
    return null;
  }

  return {
    username: user.username,
    organizationId: user.organizationId,
    displayName: user.displayName || user.username,
  };
};

const parseCookieHeader = (cookieHeader = '') =>
  cookieHeader
    .split(';')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .reduce((cookies, entry) => {
      const separatorIndex = entry.indexOf('=');

      if (separatorIndex === -1) {
        return cookies;
      }

      const name = entry.slice(0, separatorIndex).trim();
      const value = entry.slice(separatorIndex + 1).trim();

      if (name) {
        cookies[name] = decodeURIComponent(value);
      }

      return cookies;
    }, {});

const serializeCookie = (name, value, options = {}) => {
  const attributes = [`${name}=${encodeURIComponent(value)}`];

  if (options.maxAge !== undefined) {
    attributes.push(`Max-Age=${Math.max(0, Math.floor(options.maxAge))}`);
  }

  if (options.httpOnly) {
    attributes.push('HttpOnly');
  }

  if (options.secure) {
    attributes.push('Secure');
  }

  if (options.sameSite) {
    attributes.push(`SameSite=${options.sameSite}`);
  }

  if (options.path) {
    attributes.push(`Path=${options.path}`);
  }

  return attributes.join('; ');
};

const pruneExpiredSessions = () => {
  const now = Date.now();

  Array.from(sessionStore.entries()).forEach(([sessionId, session]) => {
    if (!session || session.expiresAt <= now) {
      sessionStore.delete(sessionId);
    }
  });
};

const createSession = (user) => {
  pruneExpiredSessions();

  const sessionId = crypto.randomBytes(32).toString('hex');
  sessionStore.set(sessionId, {
    user,
    expiresAt: Date.now() + SESSION_TTL_MS,
  });

  return sessionId;
};

const getSessionFromRequest = (req) => {
  pruneExpiredSessions();

  const cookies = parseCookieHeader(req.headers.cookie || '');
  const sessionId = cookies[SESSION_COOKIE_NAME];

  if (!sessionId) {
    return null;
  }

  const session = sessionStore.get(sessionId);

  if (!session || session.expiresAt <= Date.now()) {
    sessionStore.delete(sessionId);
    return null;
  }

  return {
    sessionId,
    user: session.user,
  };
};

const attachSessionCookie = (res, sessionId) => {
  res.setHeader(
    'Set-Cookie',
    serializeCookie(SESSION_COOKIE_NAME, sessionId, {
      httpOnly: true,
      secure: COOKIE_SECURE,
      sameSite: COOKIE_SAME_SITE,
      maxAge: SESSION_TTL_MS / 1000,
      path: '/',
    }),
  );
};

const clearSessionCookie = (res) => {
  res.setHeader(
    'Set-Cookie',
    serializeCookie(SESSION_COOKIE_NAME, '', {
      httpOnly: true,
      secure: COOKIE_SECURE,
      sameSite: COOKIE_SAME_SITE,
      maxAge: 0,
      path: '/',
    }),
  );
};

const destroySession = (sessionId) => {
  if (sessionId) {
    sessionStore.delete(sessionId);
  }
};

const requireAuthenticatedSession = (req, res, next) => {
  const activeSession = getSessionFromRequest(req);

  if (!activeSession) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  req.auth = activeSession.user;
  req.sessionId = activeSession.sessionId;
  return next();
};

const requireInternalApiToken = (req, res, next) => {
  if (!INTERNAL_API_TOKEN) {
    return res.status(503).json({ error: 'Internal API token is not configured' });
  }

  const requestToken =
    req.headers['x-dvct-internal-token'] ||
    req.headers['x-internal-token'] ||
    '';

  if (!safeEqual(String(requestToken), INTERNAL_API_TOKEN)) {
    return res.status(401).json({ error: 'Internal authentication required' });
  }

  return next();
};

const buildOrganizationVisibilityFilter = (organizationId) => ({
  $or: [
    { participantId: organizationId },
    { participantSourceId: organizationId },
    { 'nodeMetadata.dataProviderId': organizationId },
    { 'nodeMetadata.dataConsumerId': organizationId },
    { 'nodeMetadata.incentiveReceivedFrom.organizationId': organizationId },
  ],
});

const nodeBelongsToOrganization = (node, organizationId) => {
  if (!node || !organizationId) {
    return false;
  }

  return (
    node.participantId === organizationId ||
    node.participantSourceId === organizationId ||
    node.nodeMetadata?.dataProviderId === organizationId ||
    node.nodeMetadata?.dataConsumerId === organizationId ||
    (node.nodeMetadata?.incentiveReceivedFrom || []).some(
      (incentive) => incentive.organizationId === organizationId,
    )
  );
};

const collectNodeIdentifiers = (node) =>
  [
    node?.nodeId,
    node?.canonicalKey,
    node?.dataId,
    node?.participantId,
  ].filter(Boolean);

const buildNodeLookup = (nodes = []) => {
  const lookup = new Map();

  nodes.forEach((node) => {
    collectNodeIdentifiers(node).forEach((identifier) => {
      if (!lookup.has(identifier)) {
        lookup.set(identifier, node);
      }
    });
  });

  return lookup;
};

const expandToAuthorizedHierarchy = (nodes = [], organizationId) => {
  const lookup = buildNodeLookup(nodes);
  const queue = nodes.filter((node) => nodeBelongsToOrganization(node, organizationId));
  const visited = new Set();
  const authorizedNodes = [];

  while (queue.length > 0) {
    const currentNode = queue.shift();

    if (!currentNode || visited.has(currentNode.nodeId)) {
      continue;
    }

    visited.add(currentNode.nodeId);
    authorizedNodes.push(currentNode);

    const linkedIds = [
      ...(currentNode.prevNode || []).map((link) => link.nodeId),
      ...(currentNode.childNode || []).map((link) => link.nodeId),
    ].filter(Boolean);

    linkedIds.forEach((linkedId) => {
      const linkedNode = lookup.get(linkedId);

      if (linkedNode && !visited.has(linkedNode.nodeId)) {
        queue.push(linkedNode);
      }
    });
  }

  return authorizedNodes;
};

module.exports = {
  attachSessionCookie,
  authenticateCredentials,
  buildOrganizationVisibilityFilter,
  clearSessionCookie,
  createSession,
  destroySession,
  expandToAuthorizedHierarchy,
  getConfiguredUsers,
  getSessionFromRequest,
  nodeBelongsToOrganization,
  requireAuthenticatedSession,
  requireInternalApiToken,
};
