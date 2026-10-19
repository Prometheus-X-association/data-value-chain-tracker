import dns from "node:dns/promises";
import net from "node:net";

export class SourceError extends Error {
  constructor(message, { retryable = false } = {}) {
    super(message);
    this.name = "SourceError";
    this.retryable = retryable;
  }
}

const MAX_RESPONSE_BYTES = 2 * 1024 * 1024;

// "example.org" matches only that host; "*.example.org" matches its subdomains.
export const hostMatches = (host, patterns) =>
  patterns.some((pattern) => {
    const normalized = pattern.trim().toLowerCase();
    if (!normalized) return false;
    if (normalized.startsWith("*.")) {
      const suffix = normalized.slice(1);
      return host.endsWith(suffix) && host.length > suffix.length;
    }
    return host === normalized;
  });

const isPrivateIPv4 = (address) => {
  const [a, b] = address.split(".").map(Number);
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    a >= 224
  );
};

export const isPrivateAddress = (address) => {
  if (net.isIPv4(address)) return isPrivateIPv4(address);
  const lower = address.toLowerCase();
  if (lower.startsWith("::ffff:")) return isPrivateIPv4(lower.slice(7));
  return lower === "::" || lower === "::1" || /^f[cd]/.test(lower) || /^fe[89ab]/.test(lower);
};

/**
 * Fetches JSON from a dataspace service (connector, catalog, contract manager).
 * Only HTTPS URLs on allow-listed hosts that resolve to public addresses are fetched, redirects
 * are not followed and responses are size-limited: URLs found inside fetched documents are
 * followed too, so they must not be able to point the trace-api at internal services.
 */
export const createSafeFetcher = ({
  fetchImpl = fetch,
  lookup = (host) => dns.lookup(host, { all: true }),
  timeoutMs = 10_000,
  allowPrivateNetworks = false,
} = {}) => {
  return async (rawUrl, allowedHosts, label) => {
    let url;
    try {
      url = new URL(rawUrl);
    } catch {
      throw new SourceError(`${label}: invalid URL`);
    }

    const host = url.hostname.toLowerCase();
    if (url.protocol !== "https:" || url.username || url.password) {
      throw new SourceError(`${label}: only plain https URLs are accepted (${url.origin})`);
    }
    if (!hostMatches(host, allowedHosts)) {
      throw new SourceError(`${label}: host ${host} is not in the configured allowlist`);
    }

    if (!allowPrivateNetworks) {
      let addresses;
      try {
        addresses = await lookup(host);
      } catch {
        throw new SourceError(`${label}: cannot resolve ${host}`, { retryable: true });
      }
      if (addresses.length === 0 || addresses.some((entry) => isPrivateAddress(entry.address))) {
        throw new SourceError(`${label}: ${host} resolves to a private address`);
      }
    }

    let response;
    try {
      response = await fetchImpl(url.href, {
        headers: { Accept: "application/json" },
        redirect: "manual",
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (error) {
      throw new SourceError(`${label}: request failed (${error.message})`, { retryable: true });
    }

    if (response.status >= 300 && response.status < 400) {
      throw new SourceError(`${label}: unexpected redirect from ${host}`);
    }
    if (response.status === 404) {
      throw new SourceError(`${label}: not found`);
    }
    if (!response.ok) {
      throw new SourceError(`${label}: ${host} answered ${response.status}`, {
        retryable: response.status >= 500 || response.status === 429,
      });
    }

    const declaredLength = Number(response.headers.get("content-length") || 0);
    if (declaredLength > MAX_RESPONSE_BYTES) {
      throw new SourceError(`${label}: response too large`);
    }
    const text = await response.text();
    if (text.length > MAX_RESPONSE_BYTES) {
      throw new SourceError(`${label}: response too large`);
    }

    try {
      return JSON.parse(text);
    } catch {
      throw new SourceError(`${label}: response is not JSON`);
    }
  };
};
