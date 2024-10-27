DOCKER_COMPOSE_FILE = docker-compose.yml

.PHONY: up down rebuild clean logs

up:
	@echo "Starting all services..."
	docker-compose -f $(DOCKER_COMPOSE_FILE) up --build -d

down:
	@echo "Stopping all services..."
	docker-compose -f $(DOCKER_COMPOSE_FILE) down

clean:
	@echo "Cleaning up containers, networks, and volumes..."
	docker-compose -f $(DOCKER_COMPOSE_FILE) down -v

logs:
	@echo "Showing logs for all services..."
	docker-compose -f $(DOCKER_COMPOSE_FILE) logs -f
