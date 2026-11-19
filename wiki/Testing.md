# Testing

Each subproject has its own tests. The same suites run in GitHub Actions on every push to `main` or `develop` and on every pull request (`.github/workflows/ci.yml`).

## Prerequisites

- Node.js 20 or later
- npm and Yarn
- [Foundry](https://book.getfoundry.sh/getting-started/installation) for the Solidity unit tests

No running stack is needed for the unit tests below: core-api tests use an in-memory MongoDB.

## Test suites

| Suite | Command | What it covers |
|---|---|---|
| core-api | `make test-core-api` (or `cd app/express-server && npm test`) | Node recording and merging, canonical keys, sessions and login throttling, organization scoping, internal token |
| trace-api | `make test-trace-api` (or `cd trace-api && npm test`) | Payload validation, share calculation, data exchange resolution against fixtures, contract membership checks, safe fetching |
| Contracts (Hardhat) | `make test-contracts` (or `yarn test:blockchain:hardhat`) | PTXToken, UseCaseContract behaviour and security tests |
| Contracts (Foundry) | `yarn test:blockchain:forge` (or `forge test` in `incentive/blockchain`) | Solidity unit tests |
| All of the above except Foundry | `make test` | |

## End-to-end incentive scenarios

`e2e-tests/integration/` contains three scenarios from the design document that drive real contract calls against a local Hardhat node.

```bash
yarn deps            # install blockchain and incentive-api dependencies
yarn initialize      # compile contracts and copy the typechain types
yarn test:integration          # starts a Hardhat node and runs all scenarios (slow)
yarn test:scenario-1           # or a single scenario: -1, -2, -3
yarn test:integration:only     # if a node is already running (yarn start:node)
```

## Testing the running stack

1. Start the stack with `make init` (once) and `make up`.
2. Send a run-script event as shown in [Getting started](./Getting-Started#send-a-first-exchange).
3. Check the job: `GET /trace-api/api/jobs/{jobId}` should end in `succeeded` with `payouts` about a minute later.
4. Sign in at `http://localhost:3000/core/` as one of the participants and check the nodes.
5. Open `http://localhost:3000/incentive` and check the use case and the claimed amounts.

To test the [Data Exchange Integration](./Data-Exchange-Integration) against a real data space, set the three domain variables and `PDC_DEFAULT_CONNECTOR` in `.env`, restart trace-api, and use `GET /trace-api/api/dataexchanges/{id}/preview` before calling `/run`.
