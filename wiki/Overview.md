# Overview

DVCT answers two questions about every data exchange that happens in a Prometheus-X data space:

1. **Where did the data come from, and who processed it?** DVCT records each exchange as nodes in a graph. A node is one organization's step in a chain: providing raw data, transforming it, or consuming it. Edges point from the data source to the steps that used it.
2. **Who should be rewarded, and by how much?** Each participant is given a weight. DVCT turns the weights into shares, funds an on-chain reward pool in PTX tokens, and pushes each participant's share to its wallet once a lock period has ended.

## Concepts

| Term | Meaning |
|---|---|
| **Node** | One organization's step in a data value chain, stored in MongoDB as a JSON-LD document. See [Traceability Graph](./Traceability-Graph). |
| **Data value chain** | The graph of nodes linked from data source (parent) to processing and consumption (children). |
| **Service chain** | A Prometheus-X sequence of services, defined in the catalog and included in an ecosystem contract, that a data exchange runs through. DVCT is usually the last service in the chain. |
| **Use case (on-chain)** | A reward pool in the `UseCaseContract`, identified by a string id. DVCT creates one use case per paid-out exchange. |
| **Weight (`numOfShare`)** | A raw number of points given to a participant. It is **not** a percentage. DVCT normalizes all weights into basis points (10000 = 100%) before calling the contract. |
| **PTX** | The ERC-20 token used for rewards. |
| **Organization registry** | `config/organizations.json`: maps organization identifiers to display names, wallet addresses and login users. |

## Architecture

The stack is a set of Docker containers. Only the gateway publishes a port; every other service is reachable only on the internal `core-network`.

```mermaid
flowchart LR
    PDC[Dataspace Connector / workflow engine]
    Browser[Browser]

    subgraph DVCT [DVCT stack]
        GW[Gateway<br/>nginx :3000]
        CF[core-frontend<br/>React SPA]
        CA[core-api<br/>Express :9081]
        TA[trace-api<br/>Express :9091]
        IA[incentive-api<br/>Express :3000]
        IF[incentive-frontend<br/>Next.js :3000]
        DB[(MongoDB)]
        CH[(Local chain<br/>Anvil :8545)]
    end

    Dataspace[Connector / Catalog /<br/>Contract Manager]

    PDC -- "POST /trace-api/..." --> GW
    Browser --> GW
    GW -- "/core/" --> CF
    GW -- "/api/" --> CA
    GW -- "/trace-api/" --> TA
    GW -- "/incentive" --> IF
    TA -- "internal token" --> CA
    TA -- "HMAC-signed deposit" --> IA
    TA -- "create, lock, distribute" --> CH
    TA -- "read exchange, contract, catalog" --> Dataspace
    IA -- "depositRewardsWithPermit" --> CH
    IF -- "filtered /incentive/rpc" --> CH
    CA --> DB
    TA --> DB
```

| Service | Source | Role |
|---|---|---|
| Gateway + core-frontend | `app/` (`Dockerfile.frontend`, `nginx.conf`) | nginx serving the React graph viewer at `/core/` and routing `/api/`, `/trace-api/` and `/incentive` to the internal services. Adds security headers and rate limits. |
| core-api | `app/express-server` | Stores and serves the traceability graph. Browser users sign in with a session cookie; only trace-api may write nodes. |
| trace-api | `trace-api/` | Entry point for the data space. Validates incoming events, records traceability through core-api and runs the payout on-chain as a persisted, retried job. |
| incentive-api | `incentive/api` | Relays permit-signed reward deposits to the `UseCaseContract`. Only accepts HMAC-signed requests from trace-api. |
| incentive-frontend | `incentive/frontend` | Wallet-connected UI under `/incentive` that shows use cases, participants and claimed rewards from on-chain events. |
| hardhat (Anvil) | `incentive/blockchain` | Local demonstrator chain with the `PTXToken` and `UseCaseContract` deployed. State persists in a Docker volume. |
| mongodb | `mongo:8.0.13` | Databases `jsonldDB` (graph, sessions, use-case metadata) and `dvctTrace` (trace-api jobs). |

## How a data exchange is processed

```mermaid
sequenceDiagram
    participant Caller as PDC / last chain service
    participant TA as trace-api
    participant DS as Connector, Contract, Catalog
    participant CA as core-api
    participant IA as incentive-api
    participant UC as UseCaseContract

    Caller->>TA: POST /api/dataexchanges/{id}/run
    TA->>DS: read data exchange, signed contract, catalog
    TA-->>Caller: 202 Accepted (jobId, statusUrl)
    Note over TA: background job
    TA->>CA: POST /api/node (one per chain step)
    TA->>DS: poll until exchange is IMPORT_SUCCESS
    TA->>UC: createUseCase, updateRewardShares
    TA->>CA: save use-case metadata
    TA->>IA: signed deposit request with EIP-2612 permit
    IA->>UC: depositRewardsWithPermit
    TA->>UC: lockRewards
    Note over UC: lock period (default 60 s)
    TA->>UC: distribute → PTX sent to each wallet
```

There are two ways to submit an exchange:

- **[Data Exchange Integration](./Data-Exchange-Integration)** (recommended): the caller sends only the PDC data exchange id. trace-api reads everything else from the connector, the signed contract and the catalog, so participants and weights cannot be forged by the caller.
- **[Run Script Protocol](./Run-Script-Protocol)**: the caller sends a complete payload with participants and weights. Use it for workflow engines and testing.

Both create the same kind of [processing job](./Processing-Jobs).
