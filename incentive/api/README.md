# Incentive API

Internal service that relays permit-based reward deposits into the use case contract. Its wallet
pays the gas and holds `RELAYER_ROLE` on the contract; it can only move tokens whose owner signed an
EIP-2612 permit for the use case contract. It is not exposed by the gateway.

## Endpoint

`POST /api/incentives/distribute`

```json
{
  "useCaseId": "dvct-demo",
  "from": "<permit owner>",
  "to": "<use case contract address>",
  "amount": "1000.0",
  "permit": { "owner": "...", "spender": "<use case contract>", "amount": "<wei>", "deadline": 0, "v": 27, "r": "0x...", "s": "0x..." }
}
```

Responses: `200 { success, data: { transactionHash, useCaseId } }`, `400` invalid request or permit
mismatch, `401` missing/invalid/expired signature, `409` replayed signature, `422` rejected on-chain.

## Authentication

Every request carries an HMAC-SHA256 signature over the exact request body:

```
X-DVCT-Timestamp: <unix seconds>
X-DVCT-Signature: hex(HMAC_SHA256(INCENTIVE_API_HMAC_SECRET, "<timestamp>.<raw body>"))
```

Requests older than five minutes and reused signatures are rejected. Use `signIncentiveApiRequest`
and `IncentiveSigner` from [client/lib/IncentiveSigner.ts](client/lib/IncentiveSigner.ts) (see
[client/examples/example-usage.ts](client/examples/example-usage.ts)).

## Configuration

| Variable | Description |
|---|---|
| `PRIVATE_KEY` | Relayer wallet key (`INCENTIVE_API_PRIVATE_KEY` in the root `.env`) |
| `RPC_URL` | Chain RPC endpoint |
| `INCENTIVE_API_HMAC_SECRET` | Shared with the trace-api, at least 32 characters |
| `PORT` | Default 3000 |

`yarn build && yarn start`, or run it through the root `docker-compose.yml`.
