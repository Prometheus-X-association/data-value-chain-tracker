# Maintenance

This document describes how the **Data Value Chain Tracker (DVCT)**, a building block of the [Prometheus-X](https://prometheus-x.org/) programme, will be maintained after the project ends.

## Maintainer

DVCT is maintained by **Scheer IMC**.

## Commitment

Scheer IMC intends to maintain DVCT for a period of **12 months following the original end of the Prometheus-X project**. This period includes the **6-month extension** of the project.

During this period, our aim is to keep DVCT in a stable, usable state as it is today. Our effort will focus on small, low-risk updates that keep the existing functionality working.

## Scope of maintenance

During the maintenance period, we aim to cover minor issues such as:

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

At the end of the 12-month period, Scheer IMC will review the status of the project and update this file accordingly, for example to:

- *Extended maintenance*
- *Looking for maintainers*
- *Archived*
