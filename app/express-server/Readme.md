# DVCT core API

Express + MongoDB service behind the gateway (`/api/...`). See the root README for the endpoints
and the security model.

## Run locally (outside Docker)

```bash
cp .env.example .env      # set DVCT_INTERNAL_API_TOKEN and MONGODB_URI
npm ci
npm start                 # http://localhost:9081, Swagger on /api-docs when NODE_ENV != production
```

Users and organizations come from `config/organizations.json` at the repository root (`make init`).
Hash a password for a new user with `npm run hash-password -- '<password>'`.

## Tests

`npm test` runs the API tests against an in-memory MongoDB (no running database needed).
