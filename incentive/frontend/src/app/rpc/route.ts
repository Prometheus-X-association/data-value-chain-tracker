import { NextResponse, type NextRequest } from "next/server";

// Public JSON-RPC endpoint of the local chain (served at /incentive/rpc).
// The chain node itself is not exposed: it accepts "cheat" methods such as anvil_setBalance,
// evm_increaseTime or anvil_impersonateAccount that would let anyone act as any account.
// Only standard read methods and pre-signed transactions are forwarded.
const UPSTREAM_RPC_URL = process.env.RPC_UPSTREAM_URL || "http://hardhat:8545";
const MAX_BODY_BYTES = 128 * 1024;
const MAX_BATCH = 50;

const ALLOWED_METHODS = new Set([
  "web3_clientVersion",
  "net_version",
  "eth_chainId",
  "eth_syncing",
  "eth_blockNumber",
  "eth_gasPrice",
  "eth_maxPriorityFeePerGas",
  "eth_feeHistory",
  "eth_getBalance",
  "eth_getCode",
  "eth_getStorageAt",
  "eth_getTransactionCount",
  "eth_getBlockByNumber",
  "eth_getBlockByHash",
  "eth_getTransactionByHash",
  "eth_getTransactionReceipt",
  "eth_getLogs",
  "eth_newFilter",
  "eth_newBlockFilter",
  "eth_getFilterChanges",
  "eth_getFilterLogs",
  "eth_uninstallFilter",
  "eth_call",
  "eth_estimateGas",
  "eth_sendRawTransaction",
]);

// Lets the node sign with its unlocked dev accounts (used by the development wallet switcher).
// Never enable this on a reachable deployment.
const DEV_SIGNING_METHODS = new Set(["eth_accounts", "eth_sendTransaction", "eth_signTypedData_v4", "personal_sign"]);
const devSigningAllowed = process.env.RPC_ALLOW_DEV_SIGNING === "true";

type RpcRequest = { jsonrpc?: string; id?: unknown; method?: unknown };

const isAllowed = (method: unknown) =>
  typeof method === "string" && (ALLOWED_METHODS.has(method) || (devSigningAllowed && DEV_SIGNING_METHODS.has(method)));

const rpcError = (id: unknown, message: string) => ({
  jsonrpc: "2.0",
  id: id ?? null,
  error: { code: -32601, message },
});

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) {
    return NextResponse.json(rpcError(null, "Request too large"), { status: 413 });
  }

  let body: RpcRequest | RpcRequest[];
  try {
    body = JSON.parse(raw) as RpcRequest | RpcRequest[];
  } catch {
    return NextResponse.json(rpcError(null, "Parse error"), { status: 400 });
  }

  const requests = Array.isArray(body) ? body : [body];
  if (requests.length === 0 || requests.length > MAX_BATCH) {
    return NextResponse.json(rpcError(null, "Invalid batch size"), { status: 400 });
  }

  const rejected = requests.find((entry) => !entry || typeof entry !== "object" || !isAllowed(entry.method));
  if (rejected) {
    return NextResponse.json(rpcError(rejected?.id, `Method not allowed: ${String(rejected?.method)}`), {
      status: 403,
    });
  }

  try {
    const upstream = await fetch(UPSTREAM_RPC_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: raw,
      signal: AbortSignal.timeout(30_000),
      cache: "no-store",
    });
    return new NextResponse(await upstream.text(), {
      status: upstream.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    return NextResponse.json(rpcError(null, "Chain node unavailable"), { status: 502 });
  }
}
