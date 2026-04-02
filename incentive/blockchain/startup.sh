#!/bin/sh
set -eu

STATE_DIR="/data/anvil"
STATE_FILE="${STATE_DIR}/state.json"
RPC_URL="http://127.0.0.1:8545"
API_SIGNER_ADDRESS="0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199"
TARGET_BALANCE_HEX="0x3635c9adc5dea00000"

mkdir -p "${STATE_DIR}"

echo "Starting persistent Anvil node..."
/root/.foundry/bin/anvil \
  --host 0.0.0.0 \
  --port 8545 \
  --state "${STATE_DIR}" \
  --state-interval 5 &
ANVIL_PID=$!

cleanup() {
  if kill -0 "${ANVIL_PID}" 2>/dev/null; then
    kill "${ANVIL_PID}"
    wait "${ANVIL_PID}" || true
  fi
}

trap cleanup INT TERM EXIT

sleep 5

echo "Ensuring incentive API signer has native gas balance..."
curl -s -X POST "${RPC_URL}" \
  -H "Content-Type: application/json" \
  --data "{\"jsonrpc\":\"2.0\",\"method\":\"anvil_setBalance\",\"params\":[\"${API_SIGNER_ADDRESS}\",\"${TARGET_BALANCE_HEX}\"],\"id\":1}" \
  >/dev/null

if [ ! -f "${STATE_FILE}" ]; then
  echo "No persisted blockchain state found, deploying test environment..."
  cd /app && npx hardhat run script/deployTestEnv.ts --network localhost --no-compile
else
  echo "Persisted blockchain state found, skipping deployment bootstrap."
fi

wait "${ANVIL_PID}"
