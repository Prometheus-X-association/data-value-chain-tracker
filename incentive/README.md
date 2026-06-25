# Incentive component

The incentive component implements the on-chain reward distribution system for DVCT: smart contracts that hold and distribute PTX tokens, an API that submits signed distribution requests to those contracts, and a wallet-connected UI for managing use cases and rewards. It's made up of three independent applications, each with its own `package.json`:

| App | Path | Role |
|---|---|---|
| [Blockchain](./blockchain/) | `incentive/blockchain` | Solidity contracts (`PTXToken`, `UseCaseContract`) + local Hardhat node |
| [API](./api/) | `incentive/api` | Signs and submits reward-distribution transactions on behalf of clients |
| [Frontend](./frontend/) | `incentive/frontend` | Next.js UI for use-case management, claiming rewards, wallet connection |

See [docs/design-document.md](../docs/design-document.md) for the overall DVCT design and the [root README](../README.md) for how this fits with `core-api`/`core-frontend`/`incenti-trace`.

## Running everything together (Docker)

From the repo root:

```bash
make build-all
make up
```

This starts every DVCT service, including the three apps below. Exposed URLs:

| App | URL | Notes |
|---|---|---|
| Hardhat node | http://localhost:8545 | JSON-RPC + WebSocket, chain ID `31337` |
| Incentive API | http://localhost:3002 | `POST /api/incentives/distribute` |
| Incentive Frontend | http://localhost:3003/incentive | Wallet-connected UI |

> The frontend is configured with `basePath: "/incentive"` ([next.config.js](./frontend/next.config.js)), so `http://localhost:3003/` on its own returns 404 — you must include the `/incentive` prefix. This applies in both Docker and local dev. The frontend's own rewrites for the core API and the Hardhat RPC are nested under it too, e.g. `http://localhost:3003/incentive/rpc`.

## Running each app individually (local dev)

### Blockchain

```bash
cd incentive/blockchain
yarn                       # or: npm install
npx hardhat node           # starts a local chain at http://127.0.0.1:8545 (chainId 31337)
```

In another terminal, deploy the contracts and seed test data:

```bash
yarn ptx-deploy-test       # deploys PTXToken + UseCaseContract, plus sample use cases/transactions
```

Test with:
- `npx hardhat test` — Hardhat/TS contract tests
- `forge test` (from `incentive/blockchain`) — Foundry unit tests, requires [Forge](https://book.getfoundry.sh/getting-started/installation)
- `cast call <address> <signature>` / `cast send ...` — query or call contracts directly against `http://127.0.0.1:8545`

See [blockchain/README.md](./blockchain/) for Foundry usage and [blockchain/docs/src](./blockchain/docs/src/src/README.md) for generated contract docs.

### API

```bash
cd incentive/api
npm install
cp .env.example .env       # set PRIVATE_KEY (a funded hardhat account) and RPC_URL
npm run dev                # starts at http://localhost:3000 by default (set PORT to change)
```

Requires a running Hardhat node (see above) with the contracts deployed at the addresses in `src/config/deployment.json` / `src/config/contracts.ts`.

Test with:
```
curl -X POST http://localhost:3000/api/incentives/distribute \
  -H "Content-Type: application/json" \
  -d '{ ... signed request body ... }'
```
The request must be signed with a client's private key — see [client/lib/IncentiveSigner.ts](./api/client/lib/IncentiveSigner.ts) for the reference signer and [client/examples/example-usage.ts](./api/client/examples/example-usage.ts) for a full example. Use `scripts/addClient.ts` to register a new client (public key + permissions) against the local `FileKeyStorage` before signing requests.

### Frontend

```bash
cd incentive/frontend
npm install
cp .env.example .env        # optionally set NEXT_PUBLIC_RPC_URL (defaults to http://127.0.0.1:8545)
npm run dev                 # starts at http://localhost:3000/incentive by default
```

Since `core-frontend` and the API's local dev server also default to port 3000, run with `next dev -p 3003` (or `PORT=3003 npm run dev`) if you need to run them side by side locally, matching the Docker port mapping. Remember the `/incentive` basePath applies here too — the dev server itself prints `http://localhost:3000` on startup, but that bare URL 404s; go to `http://localhost:3000/incentive`.

Pages once running (all under the `/incentive` basePath):
- `/incentive` — all use cases / my use cases / participated use cases (reads on-chain events)
- `/incentive/create` — create a new use case
- `/incentive/use-case/[id]` — use case detail: reward pool, participants, lock duration, claim/revert rewards
- `/incentive/rewards` — reward claim overview

A test wallet switcher (`src/components/TestWalletSwitcher.tsx`) is available in development to switch between the Hardhat node's pre-funded accounts without a browser extension wallet.

Test with:
- `npm run typecheck` — `tsc --noEmit`
- `npm run lint` — `next lint`
- `npm run build` — production build (`next build`)

See [frontend/README.md](./frontend/) for the underlying T3 Stack scaffold.

## Generated/exported artifacts

Contract ABIs and TypeChain types are generated from `incentive/blockchain` and copied into the other two apps — don't hand-edit the copies:

```bash
cd incentive/blockchain
yarn export-abis            # -> incentive/frontend/src/config/abis.ts
yarn export-abis-to-api     # -> incentive/api/src/config/abis.ts
yarn copy-types             # -> incentive/api/src/typechain-types
```

`yarn initialize` (from the repo root) runs the blockchain compile + type copy + API install in one step — needed before running `incentive/api` standalone or the root e2e tests.
