DOCKER_COMPOSE_FILE = docker-compose.yml
DOCKER_COMPOSE_DEV_FILE = docker-compose.dev.yml

.PHONY: init sync-organizations up up-dev down rebuild clean logs build-all test test-core-api test-trace-api test-contracts \
	build-core-frontend build-core-api build-incentive-api build-trace-api build-incentive-frontend build-hardhat

# Generates .env (service secrets) and config/organizations.json (users with hashed passwords).
# Login passwords are written to config/dev-credentials.local.txt.
init:
	node scripts/init-dev-env.mjs

# Adds organizations from config/organizations.example.json that are missing locally (keeps .env).
sync-organizations:
	node scripts/init-dev-env.mjs --sync-organizations

up:
	@test -f .env || (echo "Missing .env - run 'make init' first" && exit 1)
	docker compose -f $(DOCKER_COMPOSE_FILE) up -d

# Same as up, plus direct service ports on 127.0.0.1, Swagger and dev wallet signing. Local only.
up-dev:
	@test -f .env || (echo "Missing .env - run 'make init' first" && exit 1)
	docker compose -f $(DOCKER_COMPOSE_FILE) -f $(DOCKER_COMPOSE_DEV_FILE) up -d

down:
	docker compose -f $(DOCKER_COMPOSE_FILE) down

rebuild:
	docker compose -f $(DOCKER_COMPOSE_FILE) up --build -d

# Removes containers, networks and volumes (database and chain state).
clean:
	docker compose -f $(DOCKER_COMPOSE_FILE) down -v

logs:
	docker compose -f $(DOCKER_COMPOSE_FILE) logs -f

build-all:
	docker compose -f $(DOCKER_COMPOSE_FILE) build

build-core-frontend:
	docker compose -f $(DOCKER_COMPOSE_FILE) build core-frontend

build-core-api:
	docker compose -f $(DOCKER_COMPOSE_FILE) build core-api

build-trace-api:
	docker compose -f $(DOCKER_COMPOSE_FILE) build trace-api

build-incentive-api:
	docker compose -f $(DOCKER_COMPOSE_FILE) build incentive-api

build-incentive-frontend:
	docker compose -f $(DOCKER_COMPOSE_FILE) build incentive-frontend

build-hardhat:
	docker compose -f $(DOCKER_COMPOSE_FILE) build hardhat

test: test-core-api test-trace-api test-contracts

test-core-api:
	cd app/express-server && npm ci && npm test

test-trace-api:
	cd trace-api && npm ci && npm test

test-contracts:
	cd incentive/blockchain && npm ci --legacy-peer-deps && NODE_ENV=docker npx hardhat test
