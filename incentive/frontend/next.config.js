/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
import "./src/env.js";

/** @type {import("next").NextConfig} */
const config = {
  output: "standalone",
  basePath: "/incentive",
  async rewrites() {
    return [
      {
        source: "/core-api/:path*",
        destination: "http://core-api:9081/:path*",
      },
      {
        source: "/rpc",
        destination: "http://hardhat:8545",
      },
      {
        source: "/rpc/:path*",
        destination: "http://hardhat:8545/:path*",
      },
    ];
  },
};

export default config;
