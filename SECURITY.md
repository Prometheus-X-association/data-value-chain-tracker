# Security Policy

This document describes how to report security vulnerabilities in the **Data Value Chain Tracker (DVCT)** and how they will be handled.

## Reporting a Vulnerability

> **Please do not report security vulnerabilities through public GitHub issues, discussions or pull requests.**

Please report vulnerabilities privately using [GitHub private vulnerability reporting](https://github.com/Prometheus-X-association/data-value-chain-tracker/security/advisories/new). This allows us to work with you on a coordinated disclosure.

To help us understand and resolve the issue, please include as much of the following information as possible:

- Type of vulnerability (for example injection, authentication bypass, signature verification flaw, smart contract issue)
- Affected component(s): core-api, core-frontend, incenti-trace, engine-test, incentive-api, incentive-frontend or the smart contracts
- Affected version(s) or commit(s)
- Full paths of the source file(s) related to the issue
- Location of the affected source code (tag, branch, commit or direct URL)
- Any special configuration required to reproduce the issue (for example environment variables or Docker Compose setup)
- Step-by-step instructions to reproduce the issue
- Impact of the issue, including how an attacker might exploit it
- Proof-of-concept or exploit code, if available
- Relevant log files, if available

## Response Targets

We will do our best to respond within the following timeframes:

| Stage | Target |
|---|---|
| Acknowledgement of the report | 2 business days |
| Triage and severity assessment | 7 days |
| Fix or mitigation for Critical issues | 30 days |
| Fix or mitigation for High and Medium issues | 90 days |

If a fix requires more time, or would require major changes to DVCT, we will inform you and agree on an appropriate timeline or mitigation before any public disclosure. Please also see [MAINTENANCE.md](MAINTENANCE.md) for the scope of ongoing maintenance.

## Disclosure Policy

We follow a coordinated disclosure process. We kindly ask that you give us reasonable time to investigate and address the issue before sharing any details publicly. Once a fix or mitigation is available, we will agree on a disclosure date with you, typically within 90 days of the initial report.

## Scope

**In scope:**

- Source code in this repository, including the backend services, frontends and smart contracts (`PTXToken`, `UseCaseContract`)
- Docker Compose configuration and deployment scripts provided in this repository
- Official documentation describing security-relevant behaviour (for example authentication, request signing and key management)

**Out of scope:**

- Vulnerabilities in third-party dependencies, including OpenZeppelin contracts; please report these to the respective upstream project
- Forks, modified versions or unofficial distributions of DVCT
- Third-party deployments, including their hosting, key management and wallet configuration
- The local development setup (for example the local Hardhat network and example configuration files), which is not intended for production use
- Social engineering, phishing or physical attacks
- Denial-of-service attacks

## Acknowledgements

We appreciate the efforts of everyone who helps keep DVCT secure. Reporters who follow this policy will be credited in the release notes of the fix, unless they prefer to remain anonymous.
