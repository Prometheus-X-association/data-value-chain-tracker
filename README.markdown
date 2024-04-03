# Data Value Chain Tracker BB Design Document

The Data Value Chain Tracker (DVCT from now on) building block is a sophisticated system that monitors the direct and indirect use of data and incentivizes data usage. it is based on a set of regulations, contractual requirements, and an immutable and distributed database that together form a robust infrastructure for traceable data exchange. DVCT not only ensures auditability and traceability of data usage but also enables organizations and individuals to see the value of their data

Example of use case, ...

**DVCT objectives**

## Conceptual Overview

![Metamodel](diagrams/dva-concept-meta.png)

### Example

![Example Instance Model](diagrams/dva-concept-instance.png)


## Technical Usage Scenarios & Features

### Features/Main Functionalities

Key functionalities:
1. xxxx
2. xxx
3. xxx

DVCT also potentially enables proving/verifying such properties about the shared data that are related to additional, sensitive (eg due to GDPR) data, without disclosing them (possibly using zero-knowledge proofs).

### Technical Usage Scenarios

With DVCT, data exchange participants can be assured that the data fulfils predefined quality requirements.

#### Management of Veracity Level Agreements

<!-- TODO -->

#### Proving & Attestation of Veracity

<!-- TODO -->

#### Logging of Results

<!-- TODO -->


## Requirements

* **`[BB_06__01]`** DVCT MUST define schemata for xxx
* **`[BB_06__02]`** DVCT MUST support xx
* **`[BB_06__03]`** DVCT MUST provide xx
* **`[BB_06__03]`** DVCT MUST support xx
* **`[BB_06__04]`** DVCT SHOULD support xx
* **`[BB_06__05]`** DVCT SHOULD support xx
* **`[BB_06__06]`** DVCT SHOULD support xx
* **`[BB_06__07]`** DVCT SHOULD support xx
* **`[BB_06__08]`** DVCT SHOULD interface with the Distributed data visualization Building block
* **`[BB_06__09]`** DVCT SHOULD interface with the Connector


## Integrations

### Direct Integrations with Other BBs

_No direct integrations identified as of yet._


### Integrations via Connector

* DVCT will likely have to directly integrate with the **Connector** itself to extend data exchange flows with veracity assurance steps
* As veracity level agreements are similar to contracts (or will become part of the contracts), DVCT will have interactions with the **Contract** component
* Potential integrations with **Consent** as well (?)
* The _point_ is strongly related to data usage


## Relevant Standards

### Data Format Standards

<!-- TODO -->

### Mapping to Data Space Reference Architecture Models

<!-- TODO -->


## Input / Output Data

### Data Veracity Level Agreements

_No concrete schema has been defined yet, please refer to conceptual model for what may be included in an agreement._


## Architecture

<!-- TODO -->


## Dynamic Behaviour

The sequence diagrams below describe possible DVA additions to the basic Connector flows.

_To be discussed with Félix and Robin_

```mermaid
---
title: Data Exchange for Data Value Chain Tracker
---

sequenceDiagram
    participant o as Orchestrator
    participant p as Provider
    participant pc as Provider Connector
    participant con as Contract Service
    participant evs as External Veracity Attestation Service
    participant cat as Catalogue Service
    participant cc as Consumer Connector
    participant c as Consumer

    p -) cat: Trigger data exchange
    cat -) cc: data exchange info (w/ veracity level agreement)
    cc -) pc: data request (w/ contract + veracity level agreement)
    pc -) con: Verify contract & policies + veracity agreement
    Note over pc: Policy verification & Access control
    pc -) p: Get data
    p -) pc: data

    alt self-attestation
        pc -) pc: Get attestation of veracity
        pc -) cc: data + attestation
    else third-party attestation
        pc -) evs: Get attestation of veracity
        evs -) pc: attestation
        pc -) cc: data + attestation
    else no agreement / attestation
        pc -) cc: data
    end

    Note over cc: Policy verification & Access control
    cc -) c: data
```

```mermaid
---
title: Data Exchange with Proof of Veracity
---

sequenceDiagram
    participant p as Provider
    participant pc as Provider Connector
    participant con as Contract Service
    participant evs as External Veracity Proving Service
    participant cat as Catalogue Service
    participant cc as Consumer Connector
    participant c as Consumer

    p -) cat: Trigger data exchange
    cat -) cc: data exchange info (w/ veracity level agreement)
    cc -) pc: data request (w/ contract + veracity level agreement)
    pc -) con: Verify contract & policies + veracity agreement
    Note over pc: Policy verification & Access control
    pc -) p: Get data
    p -) pc: data

    alt provider-proven veracity
        pc -) evs: Get Proof of Veracity
        evs -) pc: proof
        pc -) cc: data + proof
        cc -) cc: Verify proof
    else consumer-verified veracity
        pc -) cc: data
        alt local verification
            cc -) cc: Verify data veracity
        else external verification
            cc -) evs: Verify data veracity
        end
    else no agreement / verification
        pc -) cc: data
    end

    Note over cc: Policy verification & Access control
    cc -) c: data
```


## Configuration & Deployment Settings

<!-- TODO -->


## Third Party Components & Licenses

<!-- TODO -->


## Implementation Details

<!-- TODO -->


## OpenAPI Specification

<!-- TODO -->


## Test Specification

<!-- TODO -->

### Test Plan

### Unit tests

### Integration Tests
