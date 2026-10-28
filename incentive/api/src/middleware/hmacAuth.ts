import crypto from "crypto";
import { NextFunction, Request, Response } from "express";

export type RawBodyRequest = Request & { rawBody?: Buffer };

const MAX_CLOCK_SKEW_SECONDS = 300;

/**
 * Authenticates service-to-service calls with an HMAC-SHA256 signature.
 *
 *   X-DVCT-Timestamp: unix time in seconds
 *   X-DVCT-Signature: hex(HMAC_SHA256(secret, `${timestamp}.${rawBody}`))
 *
 * Requests older than five minutes are rejected and each signature is accepted once.
 */
export function createHmacAuth(secret: string) {
  const seenSignatures = new Map<string, number>();

  return (req: RawBodyRequest, res: Response, next: NextFunction): void => {
    const timestamp = String(req.headers["x-dvct-timestamp"] || "");
    const signature = String(req.headers["x-dvct-signature"] || "");
    const now = Math.floor(Date.now() / 1000);

    if (!/^\d+$/.test(timestamp) || Math.abs(now - Number(timestamp)) > MAX_CLOCK_SKEW_SECONDS) {
      res.status(401).json({ success: false, error: "Missing or expired request signature" });
      return;
    }

    const expected = crypto
      .createHmac("sha256", secret)
      .update(`${timestamp}.`)
      .update(req.rawBody ?? Buffer.alloc(0))
      .digest();
    const presented = /^[0-9a-f]{64}$/i.test(signature) ? Buffer.from(signature, "hex") : Buffer.alloc(0);

    if (presented.length !== expected.length || !crypto.timingSafeEqual(presented, expected)) {
      res.status(401).json({ success: false, error: "Invalid request signature" });
      return;
    }

    seenSignatures.forEach((expiresAt, key) => {
      if (expiresAt < now) seenSignatures.delete(key);
    });
    if (seenSignatures.has(signature)) {
      res.status(409).json({ success: false, error: "Request already processed" });
      return;
    }
    seenSignatures.set(signature, Number(timestamp) + MAX_CLOCK_SKEW_SECONDS);

    next();
  };
}
