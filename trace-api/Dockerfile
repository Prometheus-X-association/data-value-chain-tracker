FROM node:26.12.0-slim

WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund

COPY src ./src

USER node

EXPOSE 9091

CMD ["node", "src/server.js"]
