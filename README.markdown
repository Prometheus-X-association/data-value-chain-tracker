# Data Value Chain Tracker BB Design Document

The Data Value Chain Tracker (DVCT from now on) building block is a sophisticated system that monitors the direct and indirect use of data and incentivizes data usage. it is based on a set of regulations, contractual requirements, and an immutable and distributed database that together form a robust infrastructure for traceable data exchange. DVCT not only ensures auditability and traceability of data usage but also enables organizations and individuals to see the value of their data

**DVCT objectives**

The main goal of the DVCT is to solve the problem of uncertainty about the value of data by providing an overview of data use, not only the direct use of data, but also the use of data after it has been refined, combined or analyzed with other data (indirect use). Data providers (individuals or organizations) get an overview of where their data is used and can obtain information about the value of their data in the ecosystem. In addition, by tracking the use of data in the ecosystem, the DVCT can also incentivize the organizations that participate in the value creation of the data. 

## Conceptual Overview

According to Latif et al. (2009), there are three different types of data that contribute to the creation of the value chain. These are raw data, linked or concatenated data and human readable data. By identifying these three types of data, the DVCT can create the chain based on the previous root and child nodes of each data type.

![linked-data-value-chain](diagrams/linked-data-value-chain.png)

Regardless of your role in the use case, as a data provider individual or organization can provide raw data or concatenated data, but as a data consumer one will always use data and then also produce data, either as concatenated data that can be fed back into the ecosystem/use case or as final data in the form of result visualization analysis.  

![data-type-usage](diagrams/data-type.png)

### Example

![Example Instance Model](diagrams/dva-concept-instance.png)

## Technical Usage Scenarios & Features

### Features/Main Functionalities

Key functionalities:
1. Track the history of direct and indirect data usage
2. Provides digital incentives (in term of points, badges or label) for data usage
3. Distribution of points or digital incentives based on the contribution to data usage
4. Provide an overview of data usage within the ecosystem

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

_To be discussed with Félix and Robin_
_To be validated with use case partners & pool of experts_

* **`[BB_06__01]`** DVCT MUST define schemata for xxx
* **`[BB_06__02]`** DVCT MUST support tracking direct and indirect data usage 
* **`[BB_06__03]`** DVCT MUST support tracking indirect data usage up to 5 level of indirect usage
* **`[BB_06__03]`** DVCT MUST support decentralized data store
* **`[BB_06__04]`** DVCT SHOULD generate points based on the contract
* **`[BB_06__05]`** DVCT SHOULD store points and data usage in immutable database
* **`[BB_06__06]`** DVCT SHOULD distribute points based on the data output type
* **`[BB_06__07]`** DVCT SHOULD provide visualization of data usage history
* **`[BB_06__08]`** DVCT SHOULD interface with the Distributed Data Visualization Building block
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

### Data Value Chain Tracker Visualization and points

_No concrete schema has been defined yet, please refer to conceptual model for what may be included in an agreement._

![Example Instance Model](diagrams/DVCT-visualization.svg)


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
    participant dp1 as Data provider 1
    participant pc1 as Connector of Data provider 1
    participant dvct1 as DVCT of Data provider 1
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

### Reference

1. Latif, A., Saeed, A. U., Hoefler, P., Stocker, A., & Wagner, C. (2009, September). The Linked Data Value Chain: A Lightweight Model for Business Engineers. In I-SEMANTICS (pp. 568-575).
2. 
