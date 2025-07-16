FROM node:20.18.0-slim

WORKDIR /app

RUN apt-get update && apt-get install -y \
    curl \
    bash \
    git \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./

RUN npm install

COPY . .

WORKDIR /app/incentive/blockchain

RUN npm install --legacy-peer-deps

ENV SHELL=/bin/bash

RUN curl -L https://foundry.paradigm.xyz | bash

RUN /root/.foundry/bin/foundryup

ENV PATH="/root/.foundry/bin:${PATH}"

RUN npm run copy-types

WORKDIR /app/incentive/api

RUN yarn

RUN npm run build

EXPOSE 3000

CMD ["node", "./dist/index.js"]
