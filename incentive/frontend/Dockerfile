FROM node:26.12.1-alpine AS build

# Build tools for native modules
RUN apk add --no-cache python3 make g++ gcc libc-dev

WORKDIR /app

COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --network-timeout 600000

COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
RUN SKIP_ENV_VALIDATION=1 yarn build

FROM node:26.12.1-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=3000

COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/public ./public

USER node

EXPOSE 3000

CMD ["node", "server.js"]
