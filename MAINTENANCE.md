# Maintenance

This document describes how the **Data Value Chain Tracker (DVCT)**, a building block of the [Prometheus-X](https://prometheus-x.org/) programme, will be maintained after the project ends.

## Maintainer

DVCT is maintained by **Scheer IMC**.

## Commitment

Scheer IMC intends to maintain DVCT after the Prometheus-X project ends, in two phases:

| Phase | Duration | Ends |
|---|---|---|
| Initial maintenance period | 6 months after the initial project period | 30 June 2027 |
| Extension | 12 months after the original end of the Prometheus-X project | **31 December 2027** |

In total, the maintenance period runs until **31 December 2027**.

### What "maintained" means

The goal of maintenance is to keep the features that DVCT provides on the `main` branch at the end of the Prometheus-X project working. These features are:

- recording data exchanges as a tree of nodes (core-api and MongoDB),
- viewing the node tree in core-frontend,
- distributing PTX token rewards on-chain (incentive-api and smart contracts),
- the `incenti-trace` entry point used by the Prometheus-X Connector (PDC),
- running the full stack locally with Docker Compose, as described in the README.

Maintenance means keeping these features installable, buildable and running with up-to-date, secure dependencies. It does not mean adding new features or changing how the existing ones work. All changes will be small and low-risk, so that existing deployments and integrations are not affected.

## Scope of maintenance

Until 30 June 2027, we aim to cover minor issues such as:

- **Dependency updates**: reviewing and applying patch and minor updates, in particular those flagged by Dependabot.
- **Security fixes** in dependencies, where they can be applied without major changes to the code.
- **Small bug fixes** for clearly identified defects that can be resolved with limited, low-risk changes.
- **Minor documentation corrections**, for example keeping setup instructions accurate.

## Out of scope

To keep the maintenance effort sustainable, the following are not planned during this period:

- New features or functional enhancements.
- Major changes or modifications to the architecture, APIs, data model or smart contracts.
- Major version upgrades of frameworks or dependencies that require migration work.
- Support for forks, custom modifications or third-party deployments.
- Deployment or redeployment of the smart contracts on public networks.

We welcome ideas and suggestions for larger changes, and are happy to discuss them. However, we cannot commit to implementing them as part of this maintenance period.

## Contact

| Name | Role | Email |
|---|---|---|
| Irawan Nurhas | Lead maintainer | irawan.nurhas@scheer-imc.de |
| Mareike Schmidt | Maintainer | mareike.schmidt@scheer-imc.de |

## Reporting issues

- Please report bugs through [GitHub Issues](https://github.com/Prometheus-X-association/data-value-chain-tracker/issues).
- We will do our best to review new issues within a reasonable time. Responses may take longer than during active development, and some issues may not be addressed.
- Please do not report security vulnerabilities in public issues. Instead, follow the process described in [SECURITY.md](SECURITY.md).

## After the maintenance period

At the end of the maintenance period (30 June 2027), Scheer IMC will review the status of the project and update this file accordingly, for example to:

- *Extended maintenance*
- *Looking for maintainers*
- *Archived*
