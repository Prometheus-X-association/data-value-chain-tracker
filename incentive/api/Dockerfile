FROM node:26.12.0-slim AS build

WORKDIR /app

COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

COPY tsconfig.json ./
COPY src ./src
RUN yarn build

FROM node:26.12.0-slim

WORKDIR /app
ENV NODE_ENV=production

COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --production && yarn cache clean

COPY --from=build /app/dist ./dist

USER node

EXPOSE 3000

CMD ["node", "./dist/index.js"]
