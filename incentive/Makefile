INCENTIVE_API_DIR=api
NPM_RUN=npm --prefix $(INCENTIVE_API_DIR) run

# Targets for API
.PHONY: api

api: start build dev swagger

# API Commands
.PHONY: api-start api-dev api-build api-predev api-prebuild api-swagger

# Start the API application
api-start:
	$(NPM_RUN) start

# Build the API project
api-build: api-prebuild
	$(NPM_RUN) build

# Pre-build step for API (generates Swagger spec)
api-prebuild:
	$(NPM_RUN) prebuild

# Run the API application in development mode
api-dev: api-predev
	$(NPM_RUN) dev

# Pre-development step for API (generates Swagger spec)
api-predev:
	$(NPM_RUN) predev

# Generate Swagger specification for API
api-swagger:
	$(NPM_RUN) swagger

# Placeholder for other projects (e.g., frontend, backend)
.PHONY: frontend backend

# Help command to list all targets
.PHONY: help
help:
	@echo "Available commands:"
	@echo "API commands:"
	@echo "  make api-start     # Start the API application"
	@echo "  make api-build     # Build the API project"
	@echo "  make api-dev       # Run the API in development mode"
	@echo "  make api-swagger   # Generate Swagger specification"
	@echo ""
