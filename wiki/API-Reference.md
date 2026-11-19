# API Reference

All paths are given as seen through the gateway (`http://localhost:3000` by default). In development mode (`make up-dev`), the services can also be reached directly: core-api on `127.0.0.1:3001` (with Swagger UI at `/api-docs`), trace-api on `127.0.0.1:3005` (without the `/trace-api` prefix) and incentive-api on `127.0.0.1:3002`.

Errors are returned as JSON: `{ "error": "message" }` (incentive-api: `{ "success": false, "error": "message" }`). Malformed JSON answers `400`, a body that is too large `413`.

## trace-api

Gateway prefix: `/trace-api`. Authentication: `Authorization: Bearer TRACE_API_TOKEN` on every route except `/health`.

| Endpoint | Method | Description | Success |
|---|---|---|---|
| `/trace-api/health` | GET | Liveness check | `200 {"status":"ok"}` |
| `/trace-api/api/run-script` | POST | Record (and optionally pay) one exchange from a full payload. See [Run Script Protocol](./Run-Script-Protocol) | `202` new, `200` already received |
| `/trace-api/api/dataexchanges/{dataExchangeId}/run` | POST | Record (and pay) a PDC data exchange, read from the data space. See [Data Exchange Integration](./Data-Exchange-Integration) | `202` new, `200` already received |
| `/trace-api/api/dataexchanges/{dataExchangeId}/preview` | GET | Show what `/run` would record and pay, without writing | `200` |
| `/trace-api/api/jobs/{jobId}` | GET | Status and result of a job. See [Processing Jobs](./Processing-Jobs) | `200` |

| Query parameter | Applies to | Description |
|---|---|---|
| `wait` | `run-script`, `/run` | Seconds (0–60) to wait for the job to progress before answering |
| `connector` | `/run`, `/preview` | Connector base URL. Default `PDC_DEFAULT_CONNECTOR` |
| `reachEndFlow` | `/run`, `/preview` | `false` = traceability only. Default `true` |

| Status | Meaning |
|---|---|
| `400` | Invalid payload or data exchange |
| `401` | Missing or wrong token |
| `404` | Unknown job or route |
| `429` | Gateway rate limit |
| `502` | A connector, catalog or contract request failed |
| `503` | Data exchange endpoint not configured |

## core-api

### Authentication

| Endpoint | Method | Auth | Body | Success |
|---|---|---|---|---|
| `/api/auth/login` | POST | none | `{ "username": "...", "password": "..." }` | `200 { username, organizationId, displayName }` and session cookie |
| `/api/auth/logout` | POST | session | none | `204` |
| `/api/auth/me` | GET | session | none | `200 { username, organizationId, displayName }` |

Login errors: `401` invalid credentials, `403` cross-site request, `429` too many failures.

### Graph (session required, organization-scoped)

| Endpoint | Method | Description | Success |
|---|---|---|---|
| `/api/data` | GET | All nodes the caller may see | `200 [node, ...]` |
| `/api/data/{nodeId}` | GET | One node by `nodeId`, canonical key or `dataId` | `200 node` |
| `/api/data/{nodeId}` | DELETE | Delete a node whose `participantId` is the caller's organization, and the links to it | `200` |
| `/api/node-tree/{nodeId}` | GET | Node with nested `childNode` subtree and `totalIncentive` | `200` |
| `/api/participant-names` | GET | `{ "<identifier>": "<name>", ... }` for the visible graph | `200` |
| `/api/incentive-use-case-metadata/{useCaseId}` | GET | Raw weights and wallets of an on-chain use case. Members of the use case only | `200` |

Without a session these answer `401`. A node or use case the caller may not see answers `404`. The node format is described in [Traceability Graph](./Traceability-Graph#node-document).

### Internal (trace-api only)

Authentication: `X-DVCT-Internal-Token: DVCT_INTERNAL_API_TOKEN`. Not meant to be called by anything other than trace-api.

| Endpoint | Method | Description |
|---|---|---|
| `/api/node` | POST | Create or merge a traceability node. `201 { message, data: node }`, `400` with `details` on invalid input |
| `/api/internal/data?canonicalKey=...` or `?dataId=...` | GET | Look up nodes by key (one filter is required, at most 500 results) |
| `/api/internal/incentive-use-case-metadata` | POST | Store the participants, raw weights and wallets of an on-chain use case |

`POST /api/node` body (all fields optional unless noted; strings ≤ 2048 characters):

```jsonc
{
  "nodeScope": "data-source",            // optional; only value allowed
  "dvctId": "1fe8e3f84dc443e1b472ea28",
  "usecaseContractId": "32c09a520bca7915f542db7e",
  "usecaseContractTitle": "Skills ecosystem – Anonymise and train",
  "contractId": "1ede4e4c2b10f3273181b36f",
  "dataId": "step-1",
  "participantId": "https://catalog.example.org/v1/catalog/participants/ec0a6e8d9fb4c9e585310224",
  "participantSourceId": "https://catalog.example.org/v1/catalog/participants/ec0a6e8d9fb4c9e585310224",
  "participantShare": 30,
  "dataProviderId": "https://catalog.example.org/v1/catalog/participants/4f0d35da82bf80117c855e8b",
  "dataConsumerId": "https://catalog.example.org/v1/catalog/participants/ec0a6e8d9fb4c9e585310224",
  "dataConsumerIsAIProvider": true,
  "prevDataId": ["trace-source:...:..."],       // canonical keys of the parents (max 50)
  "incentiveForDataProvider": { "numPoints": 0, "factor": 1, "factorCheck": true },
  "extraIncentiveForAIProvider": { "numPoints": 30, "factor": 1, "factorCheck": true },
  "organizationNames": [{ "organizationId": "https://...", "name": "Anonymizer" }]
}
```

## incentive-api

Not reachable through the gateway. Authentication: HMAC signature (see [Security Model](./Security-Model#incentive-api)).

| Endpoint | Method | Description |
|---|---|---|
| `/health` | GET | Liveness check |
| `/api/incentives/distribute` | POST | Relay a permit-based reward deposit into a use case |

Request body:

```jsonc
{
  "useCaseId": "32c09a520bca7915f542db7e:1fe8e3f84dc443e1b472ea28",
  "from": "0xOperatorAddress",
  "to": "0xUseCaseContractAddress",            // must be the configured UseCaseContract
  "amount": "100",                              // PTX, up to 18 decimals
  "permit": {
    "owner": "0xOperatorAddress",               // must equal "from"
    "spender": "0xUseCaseContractAddress",      // must equal "to"
    "amount": "100000000000000000000",          // wei, must equal "amount"
    "deadline": 1795000000,
    "v": 27,
    "r": "0x...",
    "s": "0x..."
  }
}
```

| Status | Body / meaning |
|---|---|
| `200` | `{ "success": true, "data": { "transactionHash": "0x...", "useCaseId": "..." } }` |
| `400` | Invalid body, or permit does not match the request |
| `401` | Missing, expired or invalid signature |
| `409` | Signature already used (replay) |
| `422` | The contract rejected the transaction (revert) |
| `500` | Other error |
