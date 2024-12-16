FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install typescript and ts-node globally
RUN npm install -g typescript ts-node

# Install dependencies with legacy-peer-deps flag
RUN npm install --legacy-peer-deps

# Copy the entire project directory
COPY . .

# Set environment to docker to disable foundry integration in hardhat
ENV NODE_ENV=docker

# Expose hardhat node port
EXPOSE 8545

# Create a startup script using npx
RUN echo '#!/bin/sh' > /app/startup.sh && \
    echo 'cd /app && npx hardhat compile && ' >> /app/startup.sh && \
    echo 'cd /app && npx hardhat node & ' >> /app/startup.sh && \
    echo 'sleep 5' >> /app/startup.sh && \
    echo 'cd /app && npx hardhat run script/deployTestEnv.ts --network localhost' >> /app/startup.sh && \
    echo 'wait' >> /app/startup.sh && \
    chmod +x /app/startup.sh

# Run the startup script
CMD ["/bin/sh", "/app/startup.sh"]