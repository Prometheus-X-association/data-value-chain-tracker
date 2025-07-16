DOCKER_COMPOSE_FILE = docker-compose.yml

.PHONY: up down rebuild clean logs build-core-frontend build-core-api build-incentive-api build-incenti-trace build-engine-test build-incentive-frontend build-hardhat build-all

CORE_FRONTEND_IMAGE = data-value-chain-tracker-core-frontend:latest
CORE_API_IMAGE = data-value-chain-tracker-core-api:latest
INCENTIVE_API_IMAGE = data-value-chain-tracker-incentive-api:latest
INCENTIVE_FRONTEND_IMAGE = data-value-chain-tracker-incentive-frontend:latest
HARDHAT_IMAGE = data-value-chain-tracker-hardhat:latest
INCENTI_TRACE_IMAGE = data-value-chain-tracker-incenti-trace:latest
ENGINE_TEST_IMAGE = data-value-chain-tracker-engine-test:latest

up:
	@echo "Starting all services..."
	docker-compose -f $(DOCKER_COMPOSE_FILE) up -d

down:
	@echo "Stopping all services..."
	docker-compose -f $(DOCKER_COMPOSE_FILE) down

rebuild:
	@echo "Rebuilding and starting all services..."
	docker-compose -f $(DOCKER_COMPOSE_FILE) up --build -d

clean:
	@echo "Cleaning up containers, networks, and volumes..."
	docker-compose -f $(DOCKER_COMPOSE_FILE) down -v

logs:
	@echo "Showing logs for all services..."
	docker-compose -f $(DOCKER_COMPOSE_FILE) logs -f

build-core-frontend:
	@echo "Building core frontend image..."
	docker build -t $(CORE_FRONTEND_IMAGE) -f app/Dockerfile.frontend ./app

build-core-api:
	@echo "Building core API image..."
	docker build -t $(CORE_API_IMAGE) -f app/Dockerfile.server ./app

build-incentive-api:
	@echo "Building incentive API image..."
	docker build -t $(INCENTIVE_API_IMAGE)  -f incentive/api/Dockerfile .

build-incentive-frontend:
	@echo "Building incentive frontend image..."
	docker build -t $(INCENTIVE_FRONTEND_IMAGE) -f incentive/frontend/Dockerfile ./incentive/frontend

build-hardhat:
	@echo "Building Hardhat node image..."
	docker build -t $(HARDHAT_IMAGE) -f incentive/blockchain/Dockerfile ./incentive/blockchain

build-incenti-trace:
	@echo "Building incenti-trace API image..."
	docker build -t $(INCENTI_TRACE_IMAGE) -f  ./Dockerfile.server .

build-engine-test:
	@echo "Building incenti-trace API image..."
	docker build -t $(ENGINE_TEST_IMAGE) -f  ./Dockerfile.server .

# Build all images
build-all: build-core-frontend build-core-api build-incentive-api build-incenti-trace build-incentive-frontend build-hardhat build-engine-test
	@echo "All images built successfully!"
