# Getting started

DVCT runs as a Docker Compose stack. A `Makefile` at the root of the repository wraps the common commands.

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and [Docker Compose](https://docs.docker.com/compose/install/)
- [Make](https://www.gnu.org/software/make/)
- Node.js 20 or later (used by `make init` and for running tests outside Docker)
- [Foundry](https://book.getfoundry.sh/getting-started/installation) (only if you want to run the Solidity unit tests)

## Installation

### 1. Generate local secrets

```bash
make init
```

This runs `scripts/init-dev-env.mjs`, which writes three gitignored files:

| File | Content |
|---|---|
| `.env` | Random MongoDB password, service tokens, HMAC secret and the private keys of the two service wallets |
| `config/organizations.json` | The organization registry, copied from `config/organizations.example.json`, with a hashed password for every user |
| `config/dev-credentials.local.txt` | The plain login passwords (`username`, `password`, `organizationId`) — keep this file private |

`make init` refuses to overwrite existing files. Run `node scripts/init-dev-env.mjs --force` to regenerate everything, or `make sync-organizations` to add organizations that were added to the example registry without touching `.env`.

> Never fill in `.env` by hand from `.env.example`. The example only lists the variable names.

### 2. Build and start

```bash
make build-all
make up
```

On the first start, the chain container deploys the contracts and some demo use cases, then funds the two service wallets. The other services wait until the chain reports healthy, which can take a minute.

### 3. Open the applications

Everything is served through the gateway on `http://localhost:3000` (change it with `PUBLIC_PORT` in `.env`).

| URL | What it is |
|---|---|
| `http://localhost:3000/core/` | Core frontend: sign in and explore the traceability graph |
| `http://localhost:3000/incentive` | Incentive frontend: use cases, participants and rewards (connect a wallet) |
| `http://localhost:3000/api/...` | core-api (see [API Reference](./API-Reference)) |
| `http://localhost:3000/trace-api/api/...` | trace-api, the entry point for the PDC |

Sign in to the core frontend with a username and password from `config/dev-credentials.local.txt`. An organization only sees the node hierarchies it takes part in, so a freshly started stack shows an empty graph until an exchange has been recorded.

## Development mode

```bash
make up-dev
```

This adds `docker-compose.dev.yml`, which publishes the internal services on `127.0.0.1` only and enables Swagger and dev wallet signing:

| Service | Address |
|---|---|
| core-api (Swagger at `/api-docs`) | `http://127.0.0.1:3001` |
| incentive-api | `http://127.0.0.1:3002` |
| trace-api | `http://127.0.0.1:3005` |
| MongoDB | `127.0.0.1:27017` |
| Chain RPC | `http://127.0.0.1:8545` |

> `make up-dev` is for local debugging only. Never use it on a shared or reachable host: it exposes the chain node's unrestricted RPC and lets the incentive UI sign with the unlocked dev accounts.

## Makefile commands

| Command | Effect |
|---|---|
| `make init` | Generate `.env`, the organization registry and demo passwords |
| `make sync-organizations` | Add organizations missing from `config/organizations.json` |
| `make up` / `make up-dev` | Start the stack (production-like / with debug ports) |
| `make down` | Stop the stack |
| `make rebuild` | Rebuild images and restart |
| `make clean` | Stop and **delete volumes** (database and chain state) |
| `make logs` | Follow the logs of all services |
| `make build-all` | Build every image |
| `make build-<service>` | Build one image: `core-frontend`, `core-api`, `trace-api`, `incentive-api`, `incentive-frontend`, `hardhat` |
| `make test` | Run core-api, trace-api and contract tests (see [Testing](./Testing)) |

## Data persistence

| Volume | Holds | Removed by |
|---|---|---|
| `mongo_data_secure` | MongoDB data (graph, sessions, jobs) | `make clean` |
| `chain_data` | Anvil chain state and deployment record | `make clean` |

The two volumes are removed together so that on-chain use cases and the database always stay in sync. If you delete only one of them, trace-api may try to create use cases that already exist on-chain (or the reverse).

## Send a first exchange

With the stack running, read `TRACE_API_TOKEN` from `.env` and send a test event:

```bash
TOKEN=$(grep ^TRACE_API_TOKEN= .env | cut -d= -f2)

curl -X POST "http://localhost:3000/trace-api/api/run-script?wait=30" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "dvctId": "demo-1",
    "contractId": "demo-contract",
    "useCaseContractTitle": "Demo chain",
    "dataId": "demo-data-1",
    "dataProviderId": "http://localhost:4040/v1/catalog/participants/66d18a1dee71f9f096baec07",
    "dataConsumerId": "http://localhost:4040/v1/catalog/participants/66d18a1dee71f9f096baec08",
    "factorCheck": true,
    "reachEndFlow": true,
    "providerUrl": "n/a",
    "currentParticipantId": "http://localhost:4040/v1/catalog/participants/66d18a1dee71f9f096baec07",
    "nextParticipantId": "http://localhost:4040/v1/catalog/participants/66d18a1dee71f9f096baec08",
    "useCaseId": "demo-usecase",
    "useCaseName": "demo-usecase-run-1",
    "dataQualityCheck": "n/a",
    "rewardPool": "100",
    "participantShare": [
      { "participantName": "Participant ec07", "role": "provider", "participantId": "http://localhost:4040/v1/catalog/participants/66d18a1dee71f9f096baec07", "numOfShare": 60 },
      { "participantName": "Participant ec08", "role": "consumer", "participantId": "http://localhost:4040/v1/catalog/participants/66d18a1dee71f9f096baec08", "numOfShare": 40 }
    ]
  }'
```

Then sign in as `ec07` or `ec08` at `http://localhost:3000/core/` to see the two nodes, and poll the returned `statusUrl` (see [Processing Jobs](./Processing-Jobs)) to follow the payout. With the default 60-second lock, the job finishes about a minute later.
