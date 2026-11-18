# Prometheus-X Data Value Chain Tracker

The Data Value Chain Tracker (DVCT) is an open source building block of the [Prometheus-X](https://prometheus-x.org/) data space. It records how data moves between organizations as a graph of nodes (a *data value chain*) and rewards the organizations that took part with PTX tokens, distributed by a smart contract in proportion to each organization's contribution.

DVCT works alongside the other Prometheus-X building blocks: the [Dataspace Connector (PDC)](https://github.com/Prometheus-X-association/dataspace-connector) reports data exchanges, the [Catalog](https://github.com/Prometheus-X-association/catalog-api) describes participants and service chains, and the [Contract Manager](https://github.com/Prometheus-X-association/contract-manager) holds the signed ecosystem contracts that DVCT checks before it pays anyone.

To understand DVCT fully, we recommend reading the pages in this order:

- [Overview](./Overview)
- [Getting started](./Getting-Started)
- [Configuration](./Configuration)
- [Data Exchange Integration](./Data-Exchange-Integration)
- [Run Script Protocol](./Run-Script-Protocol)
- [Processing Jobs](./Processing-Jobs)
- [Traceability Graph](./Traceability-Graph)
- [Incentive Distribution](./Incentive-Distribution)
- [Smart Contracts](./Smart-Contracts)
- [Security Model](./Security-Model)
- [API Reference](./API-Reference)
- [Testing](./Testing)
- [Maintenance](./Maintenance)

## Quick start

```bash
git clone https://github.com/Prometheus-X-association/data-value-chain-tracker.git
cd data-value-chain-tracker
make init      # generates .env, config/organizations.json and demo login passwords
make build-all
make up        # starts the stack behind a single gateway on http://localhost:3000
```

Then open `http://localhost:3000/core/` and sign in with one of the users listed in `config/dev-credentials.local.txt`.

See [Getting started](./Getting-Started) for details.
