FROM ghcr.io/foundry-rs/foundry:v1.0.0 AS foundry

FROM node:20.19.0-slim

RUN apt-get update && apt-get install -y --no-install-recommends curl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Pinned Foundry release (Anvil is the local demonstrator chain)
COPY --from=foundry /usr/local/bin/anvil /usr/local/bin/anvil

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps --no-audit --no-fund

COPY . .

ENV NODE_ENV=docker
RUN npx hardhat compile && chmod +x /app/startup.sh

EXPOSE 8545

CMD ["/bin/sh", "/app/startup.sh"]
