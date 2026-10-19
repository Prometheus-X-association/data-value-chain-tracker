/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
import "./src/env.js";

/** @type {import("next").NextConfig} */
const config = {
  output: "standalone",
  basePath: "/incentive",
  poweredByHeader: false,
  // The chain is reached through the filtered /incentive/rpc route (src/app/rpc/route.ts) and the
  // core API through the gateway; there are deliberately no transparent proxies here.
};

export default config;
