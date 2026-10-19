const crypto = require('crypto');
const Session = require('../models/session');
const { findUser, loadRegistry } = require('./organizations');

const SESSION_COOKIE_NAME = process.env.DVCT_SESSION_COOKIE_NAME || 'dvct_session';
const SESSION_TTL_MS = Number(process.env.DVCT_SESSION_TTL_MS || 1000 * 60 * 60 * 8);
const COOKIE_SAME_SITE = process.env.DVCT_SESSION_SAME_SITE || 'Strict';
const COOKIE_SECURE = process.env.DVCT_SESSION_SECURE === 'true';

const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const loginFailures = new Map();

const safeEqual = (left = '', right = '') => {
  const leftDigest = crypto.createHash('sha256').update(String(left)).digest();
  const rightDigest = crypto.createHash('sha256').update(String(right)).digest();
  return crypto.timingSafeEqual(leftDigest, rightDigest);
};

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

// Format: scrypt$N$r$p$<salt base64>$<hash base64>
const verifyPassword = (password, storedHash) => {
  const parts = String(storedHash).split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') {
    return false;
  }

  const [, N, r, p, saltB64, hashB64] = parts;
  const expected = Buffer.from(hashB64, 'base64');
  const actual = crypto.scryptSync(String(password), Buffer.from(saltB64, 'base64'), expected.length, {
    N: Number(N),
    r: Number(r),
    p: Number(p),
    maxmem: 64 * 1024 * 1024,
  });

  return crypto.timingSafeEqual(actual, expected);
};

const hashPassword = (password) => {
  const N = 16384;
  const r = 8;
  const p = 1;
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(String(password), salt, 32, { N, r, p });
  return `scrypt$${N}$${r}$${p}$${salt.toString('base64')}$${hash.toString('base64')}`;
};

// A fixed hash so that unknown usernames cost the same time as wrong passwords.
const DUMMY_PASSWORD_HASH = hashPassword(crypto.randomBytes(16).toString('hex'));

const toProfile = (organization, username) => ({
  username,
  organizationId: organization.organizationId,
  displayName: organization.displayName,
  identifiers: organization.identifiers,
});

const authenticateCredentials = (username = '', password = '') => {
  const user = findUser(username);
  const passwordMatches = verifyPassword(password, user ? user.passwordHash : DUMMY_PASSWORD_HASH);

  if (!user || !passwordMatches) {
    return null;
  }

  return toProfile(user.organization, user.username);
};

// Failed sign-ins are limited per username and, more loosely, per client IP so that one
// mistyping user behind a shared proxy does not lock out everybody else.
const loginThrottleLimits = (req, username) => {
  const perUser = Number(process.env.DVCT_LOGIN_MAX_FAILURES || 10);
  return [
    { key: `user:${String(username).toLowerCase()}`, limit: perUser },
    { key: `ip:${req.ip}`, limit: perUser * 5 },
  ];
};

const pruneLoginFailures = (now) => {
  loginFailures.forEach((entry, key) => {
    if (now - entry.windowStart > LOGIN_WINDOW_MS) {
      loginFailures.delete(key);
    }
  });
};

const isLoginThrottled = (req, username) => {
  pruneLoginFailures(Date.now());
  return loginThrottleLimits(req, username).some(
    ({ key, limit }) => (loginFailures.get(key)?.count || 0) >= limit,
  );
};

const recordLoginFailure = (req, username) => {
  const now = Date.now();
  loginThrottleLimits(req, username).forEach(({ key }) => {
    const entry = loginFailures.get(key) || { count: 0, windowStart: now };
    entry.count += 1;
    loginFailures.set(key, entry);
  });
};

// Only the user's own counter is reset: signing in to one account must not reset the IP budget.
const clearLoginFailures = (req, username) => {
  loginFailures.delete(`user:${String(username).toLowerCase()}`);
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
        try {
          cookies[name] = decodeURIComponent(value);
        } catch (error) {
          cookies[name] = value;
        }
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

const createSession = async (profile) => {
  const token = crypto.randomBytes(32).toString('hex');
  await Session.create({
    tokenHash: hashToken(token),
    organizationId: profile.organizationId,
    username: profile.username,
    expiresAt: new Date(Date.now() + SESSION_TTL_MS),
  });
  return token;
};

const getSessionFromRequest = async (req) => {
  const token = parseCookieHeader(req.headers.cookie || '')[SESSION_COOKIE_NAME];

  if (!token || !/^[0-9a-f]{64}$/.test(token)) {
    return null;
  }

  const session = await Session.findOne({ tokenHash: hashToken(token) }).lean();
  if (!session || session.expiresAt <= new Date()) {
    return null;
  }

  // Re-read the registry so that removed users or organizations lose access immediately.
  const user = findUser(session.username);
  if (!user || user.organization.organizationId !== session.organizationId) {
    await Session.deleteOne({ _id: session._id });
    return null;
  }

  return { token, user: toProfile(user.organization, user.username) };
};

const attachSessionCookie = (res, token) => {
  res.setHeader(
    'Set-Cookie',
    serializeCookie(SESSION_COOKIE_NAME, token, {
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

const destroySession = async (token) => {
  if (token) {
    await Session.deleteOne({ tokenHash: hashToken(token) });
  }
};

const requireAuthenticatedSession = async (req, res, next) => {
  try {
    const activeSession = await getSessionFromRequest(req);

    if (!activeSession) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    req.auth = activeSession.user;
    req.sessionToken = activeSession.token;
    return next();
  } catch (error) {
    return next(error);
  }
};

const requireInternalApiToken = (req, res, next) => {
  const internalApiToken = process.env.DVCT_INTERNAL_API_TOKEN || '';

  if (internalApiToken.length < 32) {
    return res.status(503).json({ error: 'Internal API token is not configured' });
  }

  const requestToken = req.headers['x-dvct-internal-token'] || '';

  if (!safeEqual(String(requestToken), internalApiToken)) {
    return res.status(401).json({ error: 'Internal authentication required' });
  }

  return next();
};

const allowedOrigins = () =>
  String(process.env.DVCT_CORS_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

// CSRF defence in depth (cookies are already SameSite=Strict): state-changing requests coming
// from a browser must originate from this site or from an explicitly allowed origin.
const requireTrustedOrigin = (req, res, next) => {
  const origin = req.headers.origin || (req.headers.referer ? safeOrigin(req.headers.referer) : '');

  if (!origin) {
    return next(); // Not a browser request (curl, service-to-service).
  }

  const host = req.headers['x-forwarded-host'] || req.headers.host || '';
  if (safeHost(origin) === host || allowedOrigins().includes(origin)) {
    return next();
  }

  return res.status(403).json({ error: 'Cross-site request rejected' });
};

const safeOrigin = (url) => {
  try {
    return new URL(url).origin;
  } catch (error) {
    return 'invalid';
  }
};

const safeHost = (url) => {
  try {
    return new URL(url).host;
  } catch (error) {
    return 'invalid';
  }
};

// --- Organization-scoped visibility -------------------------------------------------------

const nodeBelongsToOrganization = (node, identifiers = []) => {
  if (!node || identifiers.length === 0) {
    return false;
  }

  const ids = new Set(identifiers);
  return (
    ids.has(node.participantId) ||
    ids.has(node.participantSourceId) ||
    ids.has(node.nodeMetadata?.dataProviderId) ||
    ids.has(node.nodeMetadata?.dataConsumerId) ||
    (node.nodeMetadata?.incentiveReceivedFrom || []).some((incentive) => ids.has(incentive.organizationId))
  );
};

const nodeOwnedByOrganization = (node, identifiers = []) =>
  Boolean(node?.participantId) && identifiers.includes(node.participantId);

const buildNodeLookup = (nodes = []) => {
  const lookup = new Map();

  // Links reference nodes by nodeId or canonicalKey only.
  nodes.forEach((node) => {
    [node?.nodeId, node?.canonicalKey].filter(Boolean).forEach((identifier) => {
      if (!lookup.has(identifier)) {
        lookup.set(identifier, node);
      }
    });
  });

  return lookup;
};

// An organization sees the nodes it takes part in plus the value chains they are linked to.
const expandToAuthorizedHierarchy = (nodes = [], identifiers = []) => {
  const lookup = buildNodeLookup(nodes);
  const queue = nodes.filter((node) => nodeBelongsToOrganization(node, identifiers));
  const visited = new Set();
  const authorizedNodes = [];

  while (queue.length > 0) {
    const currentNode = queue.shift();

    if (!currentNode || visited.has(currentNode.nodeId)) {
      continue;
    }

    visited.add(currentNode.nodeId);
    authorizedNodes.push(currentNode);

    [...(currentNode.prevNode || []), ...(currentNode.childNode || [])]
      .map((link) => link.nodeId)
      .filter(Boolean)
      .forEach((linkedId) => {
        const linkedNode = lookup.get(linkedId);
        if (linkedNode && !visited.has(linkedNode.nodeId)) {
          queue.push(linkedNode);
        }
      });
  }

  return authorizedNodes;
};

// Validates the registry at startup so configuration errors fail fast.
const assertAuthConfiguration = () => {
  loadRegistry();
  if ((process.env.DVCT_INTERNAL_API_TOKEN || '').length < 32) {
    throw new Error('DVCT_INTERNAL_API_TOKEN must be set to at least 32 characters. Run "make init".');
  }
};

module.exports = {
  assertAuthConfiguration,
  attachSessionCookie,
  authenticateCredentials,
  clearLoginFailures,
  clearSessionCookie,
  createSession,
  destroySession,
  expandToAuthorizedHierarchy,
  getSessionFromRequest,
  hashPassword,
  isLoginThrottled,
  nodeBelongsToOrganization,
  nodeOwnedByOrganization,
  recordLoginFailure,
  requireAuthenticatedSession,
  requireInternalApiToken,
  requireTrustedOrigin,
  verifyPassword,
};
