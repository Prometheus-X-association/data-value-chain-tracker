FROM node:20.18.0-slim

WORKDIR /app

# Copy package files
COPY package*.json ./

RUN apt-get update && apt-get install -y \
    curl \
    bash \
    git \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Install typescript and ts-node globally
RUN npm install -g typescript ts-node

# Install dependencies with legacy-peer-deps flag
RUN npm install --legacy-peer-deps

# Copy the entire project directory
COPY . .

ENV SHELL=/bin/bash
ENV NODE_ENV=docker

RUN curl -L https://foundry.paradigm.xyz | bash

RUN /root/.foundry/bin/foundryup

ENV PATH="/root/.foundry/bin:${PATH}"

RUN cd /app && npx hardhat compile

# Expose hardhat node port
EXPOSE 8545

COPY startup.sh /app/startup.sh

RUN chmod +x /app/startup.sh

# Run the startup script
CMD ["/bin/sh", "/app/startup.sh"]
