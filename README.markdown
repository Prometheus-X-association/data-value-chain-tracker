# Data Value Chain Tracker BB Design Document

The Data Value Chain Tracker (DVCT from now on) building block is a sophisticated system that monitors the direct and indirect use of data and incentivizes data usage. it is based on a set of regulations, contractual requirements, and an immutable and distributed database that together form a robust infrastructure for traceable data exchange. DVCT not only ensures auditability and traceability of data usage but also enables organizations and individuals to see the value of their data

## Conceptual Overview

According to Latif et al. (2009), there are three different types of data that contribute to the creation of the value chain. These are raw data, linked or concatenated data and human readable data. By identifying these three types of data, the DVCT can create the chain based on the previous root and child nodes of each data type.

![linked-data-value-chain](diagrams/linked-data-value-chain.png)
Linked data value chain (Latif et al., 2009)

Regardless of one's role in the use case, as a data provider (individual or organization) can provide raw data or concatenated data, but as a data consumer one will always use data and then also produce data, either as concatenated data that can be fed back into the ecosystem/use case partner or as final data in the form of result visualization analysis.

![data-type-usage](diagrams/data-type.png)

To encourage data sharing, digital incentives should be provided to the ecosystem. These digital incentives can be used to convert the "value" of data sharing into a valuable asset that can be used for various activities within the Promotheus X ecosystem. DVCT act as tool to distribute the digital incentives based on data usage of participants.

## Technical Usage Scenarios & Features

The main goal of the DVCT is to solve the problem of uncertainty about the value of data by providing an overview of data use, not only the direct use of data, but also the use of data after it has been refined, combined or analyzed with other data (indirect use). Data providers (individuals or organizations) get an overview of where their data is used and can obtain information about the value of their data in the ecosystem. In addition, by tracking the use of data in the ecosystem, the DVCT can also incentivize the organizations that participate in the value creation of the data. 

Example of technical usage scenarios could be skills gap analytics, 


visualization of value tracking for DP1:
![data-chain-visualization-participant 1](diagrams/dvct-viz-1.png)

Visualization of value tracking for DP2/DC1
![data-chain-visualization-participant 2](diagrams/dvct-viz-2.png)

visualization of value tracking for DC2
![data-chain-visualization-participant 3](diagrams/dvct-viz-3.png)

### Features/Main Functionalities

Key functionalities:
1. Track the history of direct and indirect data usage of shared data
2. Handle the distribution of digital incentives (in terms of points, tokens, badges, or labels) based on the contract.
3. Provide a map/overview of data-usage of shared data within the ecosystem.

DVCT also potentially enables proving/verifying such properties about the shared data that are related to additional, sensitive (eg due to GDPR) data, without disclosing them (possibly using zero-knowledge proofs).

## Requirements

_To be discussed with Félix and Robin_
_To be validated with use case partners & pool of experts_

* **`[BB_06__01]`** DVCT MUST support tracking direct and indirect data usage  
* **`[BB_06__02]`** DVCT MUST interface with the Contract
* **`[BB_06__03]`** DVCT MUST support decentralized data store
* **`[BB_06__04]`** DVCT SHOULD have access to points/token storage
* **`[BB_06__05]`** DVCT MUST store points/tokens and data-usage-history in immutable database
* **`[BB_06__06]`** DVCT SHOULD distribute points based on the data output type 
* **`[BB_06__07]`** DVCT SHOULD provide visualization of data value chain (data-usage history)
* **`[BB_06__08]`** DVCT SHOULD interface with the Distributed Data Visualization Building block
* **`[BB_06__09]`** DVCT MUST interface with the Data Space Connector
* **`[BB_06__10]`** DVCT SHOULD support tracking history up to 3 level of indirect usage


## Integrations

### Direct Integrations with Other BBs

_Distributed data visualization._
_contract._



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
Input data:

The output of data type is inform of JSON format:
![node-data](diagrams/node-data.png)

### Data Value Chain Tracker points distribution

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
