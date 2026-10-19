#!/bin/sh
# Local demonstrator chain. Anvil listens on the internal Docker network only (no published port);
# browsers reach it through the incentive frontend's filtered /incentive/rpc proxy.
# The chain state and its deployment record live in /data/anvil (a Docker volume), so recreating
# the container keeps every use case; "make clean" removes the volume together with the database.
set -eu

STATE_DIR="/data/anvil"
STATE_FILE="${STATE_DIR}/state.json"
DEPLOYMENT_RECORD="${STATE_DIR}/deployment.json"
RPC_URL="http://127.0.0.1:8545"

mkdir -p "${STATE_DIR}"
rm -f /tmp/dvct-chain-ready

echo "Starting persistent Anvil node..."
anvil \
  --host 0.0.0.0 \
  --port 8545 \
  --state "${STATE_FILE}" \
  --state-interval 5 &
ANVIL_PID=$!

cleanup() {
  if kill -0 "${ANVIL_PID}" 2>/dev/null; then
    kill "${ANVIL_PID}"
    wait "${ANVIL_PID}" || true
  fi
}

trap cleanup INT TERM EXIT

until curl -s -X POST "${RPC_URL}" -H "Content-Type: application/json" \
  --data '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}' >/dev/null; do
  sleep 1
done

cd /app
if [ -f "${STATE_FILE}" ] && [ -f "${DEPLOYMENT_RECORD}" ]; then
  echo "Persisted chain state found, skipping contract deployment."
  cp "${DEPLOYMENT_RECORD}" /app/deployment.local.json
else
  echo "No persisted chain state, deploying contracts and demo use cases..."
  npx hardhat run script/deployTestEnv.ts --network localhost --no-compile
  cp /app/deployment.local.json "${DEPLOYMENT_RECORD}"
fi

echo "Bootstrapping service wallets..."
npx hardhat run script/bootstrapServices.ts --network localhost --no-compile
touch /tmp/dvct-chain-ready

wait "${ANVIL_PID}"
