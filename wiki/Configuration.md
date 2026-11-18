# Configuration

DVCT is configured through environment variables (generated into `.env` by `make init` and passed to the containers by `docker-compose.yml`) and one shared file, the organization registry.

## Environment variables

### Generated secrets

These are created by `make init`. Every compose service refuses to start if a required one is missing.

| Variable | Used by | Purpose |
|---|---|---|
| `MONGO_ROOT_USERNAME`, `MONGO_ROOT_PASSWORD` | mongodb, core-api, trace-api | MongoDB root credentials |
| `DVCT_INTERNAL_API_TOKEN` | core-api, trace-api | Token trace-api sends in `X-DVCT-Internal-Token` to write the graph |
| `TRACE_API_TOKEN` | trace-api | Bearer token the PDC or workflow engine must send to trace-api |
| `INCENTIVE_API_HMAC_SECRET` | trace-api, incentive-api | Shared secret for signing deposit requests |
| `INCENTIVE_API_PRIVATE_KEY` / `INCENTIVE_RELAYER_ADDRESS` | incentive-api / chain | Relayer wallet: pays gas for deposits, holds `RELAYER_ROLE` |
| `TRACE_OPERATOR_PRIVATE_KEY` / `TRACE_OPERATOR_ADDRESS` | trace-api / chain | Operator wallet: owns the use cases trace-api creates and funds their reward pools |

The chain container only receives the two wallet *addresses*; it funds them with gas and the operator with PTX at every start.

### Gateway and sessions

| Variable | Default | Purpose |
|---|---|---|
| `PUBLIC_PORT` | `3000` | Host port of the gateway |
| `DVCT_SESSION_SECURE` | `false` | Set to `true` when the gateway is served over HTTPS (adds `Secure` to the session cookie) |
| `DVCT_CORS_ORIGINS` | empty | Comma-separated extra browser origins allowed to call core-api. Same-origin use through the gateway needs none |
| `DVCT_SESSION_TTL_MS` | `28800000` (8 h) | Session lifetime |
| `DVCT_SESSION_COOKIE_NAME` | `dvct_session` | Session cookie name |
| `DVCT_SESSION_SAME_SITE` | `Strict` | `SameSite` attribute of the cookie |
| `DVCT_LOGIN_MAX_FAILURES` | `10` | Failed sign-ins allowed per username in 15 minutes (five times this per IP) |

### Incentives

| Variable | Default | Purpose |
|---|---|---|
| `INCENTIVE_LOCK_SECONDS` | `60` | Lock period applied before rewards are distributed. Between 60 and 31536000 (365 days) |
| `INCENTIVE_MAX_REWARD_POOL` | `1000000` | Largest reward pool (PTX) a single exchange may request |
| `INCENTIVE_DEFAULT_REWARD_POOL` | `1000` | Reward pool used by the [Run Script Protocol](./Run-Script-Protocol) when the payload gives none |

### Data-exchange endpoint

The [Data Exchange Integration](./Data-Exchange-Integration) endpoint stays disabled (answers `503`) until the three domain lists are set.

| Variable | Example | Purpose |
|---|---|---|
| `PDC_CONNECTOR_DOMAINS` | `connector.example.org,*.connectors.example.org` | Connector hosts trace-api may query |
| `CATALOG_API_DOMAINS` | `catalog.example.org` | Catalog hosts (ecosystems, participants, offerings, resources) |
| `CONTRACT_API_DOMAINS` | `contracts.example.org` | Contract Manager hosts |
| `PDC_DEFAULT_CONNECTOR` | `https://connector.example.org` | Connector used when a request has no `?connector=`. Must be `https://` |
| `DATAEXCHANGE_COMPLETION_TIMEOUT_SECONDS` | `1800` | How long a payout waits for the exchange to reach `IMPORT_SUCCESS` |
| `DVCT_SERVICE_OFFERINGS` | `6842ae6b...` | Catalog id(s) of the DVCT service offering, hidden from the graph. Optional, see [below](./Data-Exchange-Integration#the-dvct-step-is-not-recorded) |
| `DATASPACE_HTTP_TIMEOUT_MS` | `10000` | Timeout of each request to the data space |
| `DATASPACE_ALLOW_PRIVATE_NETWORKS` | `false` | Allow hosts that resolve to private addresses. Local testing only |

Domain entries are exact host names or `*.domain` wildcards (`*.example.org` matches subdomains, not `example.org` itself).

### Development only

| Variable | Set by | Purpose |
|---|---|---|
| `DVCT_ENABLE_SWAGGER` | `docker-compose.dev.yml` | Serve Swagger UI at core-api `/api-docs` |
| `RPC_ALLOW_DEV_SIGNING` | `docker-compose.dev.yml` | Let the incentive frontend's `/rpc` proxy forward signing calls to the unlocked dev accounts |

## Organization registry

`config/organizations.json` is mounted read-only into core-api and trace-api. It is a JSON array; each entry describes one organization:

```jsonc
[
  {
    // Identifier used in exchanges: the catalog participant URL, or any stable id
    "organizationId": "https://catalog.example.org/v1/catalog/participants/66d18a1dee71f9f096baec07",
    // Name shown in the UIs (falls back to the name reported by the catalog)
    "displayName": "Example Data Provider",
    // Other identifiers that refer to the same organization
    "aliases": ["https://connector.provider.example.org/"],
    // Wallet that receives this organization's PTX rewards (null = cannot be paid)
    "walletAddress": "0x14dC79964da2C08b23698B3D3cc7Ca32193d9955",
    // Login users for the core frontend
    "users": [
      { "username": "provider", "passwordHash": "scrypt$16384$8$1$..." }
    ]
  }
]
```

| Field | Used by | Rules |
|---|---|---|
| `organizationId` | both | Required and unique. Matched exactly against participant ids in exchanges |
| `aliases` | both | Optional. Each alias must be unique across the whole registry |
| `displayName` | core-api | Optional |
| `walletAddress` | trace-api | Must be a valid address. A participant with a non-zero weight but no wallet makes the payout fail with `No wallet address registered for participant ...` |
| `users[].username`, `users[].passwordHash` | core-api | `passwordHash` must be a scrypt hash. Generate one with `make init` or `npm run hash-password` in `app/express-server` |

### Adding an organization

1. Add the entry to `config/organizations.json` (or to `config/organizations.example.json`, then run `make sync-organizations`, which also generates passwords).
2. Restart core-api and trace-api: `docker compose restart core-api trace-api`.

> Only wallet **addresses** are stored. DVCT never needs a participant's private key: rewards are pushed to the address by the contract.

Instead of a file, core-api can read the registry from the `DVCT_ORGANIZATIONS_JSON` variable. The file path is set with `DVCT_ORGANIZATIONS_FILE`.

## Contract addresses

trace-api reads `PTX_TOKEN_ADDRESS` and `USECASE_CONTRACT_ADDRESS` from `incentive/api/src/config/deployment.json` (mounted as `INCENTIVE_DEPLOYMENT_FILE`). The incentive API and frontend read the same addresses from their `src/config/` folders. If you deploy the contracts somewhere else, update these files and the ABIs with `yarn export-abis` and `yarn export-abis-to-api` in `incentive/blockchain`.
