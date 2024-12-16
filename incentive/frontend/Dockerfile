FROM node:20.18.0-alpine AS build

# Install dependencies needed for node-gyp and other build tools
RUN apk add --no-cache python3 make g++ gcc libc-dev

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY yarn.lock ./

# Install dependencies
RUN yarn install --frozen-lockfile

# Copy source code
COPY . .

# Build the application
RUN yarn build

# Production image
FROM node:20.18.0-alpine AS runner

WORKDIR /app

# Copy necessary files from build stage
COPY --from=build /app/next.config.js ./
COPY --from=build /app/package.json ./
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

# Start the application
CMD ["node", "server.js"]