# Data Value Chain Tracker BB Design Document

The Data Value Chain Tracker (DVCT from now on) building block is a sophisticated system that monitors the direct and indirect use of data and distribute digital incentive for the data usage. it is based on a set of regulations, contractual requirements, and an immutable and distributed database that together form a robust infrastructure for traceable data exchange and value co-creation. DVCT not only ensures auditability and traceability of data usage but also enables organizations and individuals to see the value of their data.

## Conceptual Overview

According to Latif et al. (2009), there are three different types of data that contribute to the creation of the value chain. These are raw data, linked or concatenated data and human readable data. By identifying these three types of data, the DVCT can create the chain based on the previous root and child nodes of each data type.

![linked-data-value-chain](diagrams/linked-data-value-chain.png)
Linked data value chain (Latif et al., 2009)

Regardless of one's role in the use case, as a data provider (individual or organization) can provide raw data or concatenated data, but as a data consumer one will always use data and then also produce data, either as concatenated data that can be fed back into the ecosystem/use case partner or as final data in the form of result visualization analysis.

![data-type-usage](diagrams/data-type.png)

To encourage data sharing, digital incentives should be provided to the ecosystem. These digital incentives can be used to convert the "value" of data sharing into a valuable asset that can be used for various activities within the Promotheus-X (PTX) ecosystem. DVCT act as tool to distribute the digital incentives based on data usage of participants.

As data provider or data owner, organization and individual can use DVCT to find out when, how, and by whom their data was used, as well as what other data affected the process of making new data type/items (concatenated data or visualization data).

## Technical Usage Scenarios & Features

The main goal of the DVCT is to solve the problem of uncertainty about the value of data by providing an overview of data use, not only the direct use of data, but also the use of data after it has been refined, combined or analyzed with other data (indirect use). Data providers (individuals or organizations) get an overview of where their data is used and can obtain information about the value of their data in the ecosystem, this can help them to better negotiate their data and service offering. In addition, by tracking the use of data in the ecosystem, the DVCT will handle the distribution of digital incentive to the organizations that participate in the value co-creation of the data usage. 

An example of a use case is skills gap analytics, in which an organization as the use case orchestrator defines the use case including the data flow and digital incentives that will be distributed to use case participants in the contract. The services required for the skill gap analytics will include different data providers and AI providers who aim to improve the skills gap analytics by combining external data with internal skill data. Based on the use case, some technical usage scenario and role of the DVCT can be described in the table below:

| Process                                                                                                                                                  | DVCT role                                                                                                                                            |
|----------------------------------------------------------------------------------------------------------------------------------------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------|
| Use Case Orchestrator defines the use case (data flow, point distribution, data/AI requirements)    | Extracting information from the contract about the data flow (participant's role, data usage and data type of data usage) and the distribution of points  |
| Data providers share data with data consumers/AI providers on the basis of the contract                                                                            | Interaction with the dataspace connector, generation of nodes and the chain after data consumption/usage                                                              |
| Data consumers/AI providers who consume raw data and bring the result of their AI service back into the ecosystem as aggregated data/chained data | Create and store immutable json data consisting of nodes that identify prevNode/rawdata and children                                                |
| Use Case Orchestrator sets incentives for data providers and data consumers based on the contract                                                                   | Interaction with the contract, the digital wallet of the point/token giver and distribution of the digital incentive based on the contract                                                |
| Data providers want to know where their data is used                                                                                         | Read the json data node, interact with the data visualization to create the value chain three                                                                |                                                                                                          
### Features/Main Functionalities

Based on the DVCT objective and technical usage scenario, there are three key functionalities for the BB, the key functionalities are:
1. Track the history of direct and indirect data usage of shared data
2. Handle the distribution of digital incentives (in terms of points, tokens, badges, or labels) based on the contract.
3. Provide a map/overview of data-usage for monitoring data-usage distribution within the ecosystem.

## Requirements

Some requirements for the DVCT are based on the DVCT objectives, the technical usage scenario, the initial conceptual overview and GAIA-X and IDSA, including*:

* **`[BB_06__01]`** DVCT MUST support tracking direct and indirect data usage  
* **`[BB_06__02]`** DVCT MUST interface with the Contract
* **`[BB_06__03]`** DVCT MUST support distributed data storing the value chain data (data-usage history)
* **`[BB_06__04]`** DVCT SHOULD have access to points/token storage
* **`[BB_06__05]`** DVCT MUST store points/tokens and data-usage-history in immutable database
* **`[BB_06__06]`** DVCT SHOULD distribute points based on the data output type 
* **`[BB_06__07]`** DVCT SHOULD provide visualization of data value chain (data-usage history)
* **`[BB_06__08]`** DVCT SHOULD interface with the Distributed Data Visualization Building block
* **`[BB_06__09]`** DVCT MUST interface with the Data Space Connector
* **`[BB_06__10]`** DVCT SHOULD support tracking history up to 3 level of indirect usage

_*To be further discussed with Félix and Robin_\
_*To be validated with use case partners & pool of experts_\


## Integrations
In order to make the BB function, the integration with other BB is expected:

### Direct Integrations with Other BBs
* _Contract._\
The DVCT needs to get data from the contract about the contract identifier, the data used/transferred and the share of the distribution of digital incentives. The information forms the basis for the distribution of digital incentives after the data usage process.

* _Distributed data visualization._\
The DVCT will provide node and chain data that need to be visualize to the data owner, this will help data owner to get overview regarding the value/usefulness of their data within different use case or PTX data space.

* _Billing or Digital wallet._\
The DVCT needs access to the points/token holders of the point/token givers defined by orchestrators that provide digital incentives to their use case participants. The DVCT is not responsible for generating the digital incentives and storing the digital incentives, but for distributing and storing the value or percentage of the distribution for each node in an immutable database.

### Integrations via Connector

* DVCT will likely need to be integrated directly into the **Connector** to extend the data exchange flows and perform the smart contract process to update the DVCT containing the value chain. 

## Relevant Standards
- [Decentralized identifiers (DIDs)](https://w3c.github.io/did-core/) to allow verifiable, decentralized digital identity.
- [ISO 8000-117](https://www.iso.org/standard/81208.html) for data quality and immutability of distributed ledger including Blockchain

### Data Format Standards
- [JSON-LD](https://json-ld.org/)
- [ISO 8601](https://en.wikipedia.org/wiki/ISO_8601) for Date and time format

### Mapping to Data Space Reference Architecture Models

**DSSC:** see:
- [Data Provenance Tracking](https://docs.internationaldataspaces.org/ids-knowledgebase/v/ids-ram-4/perspectives-of-the-reference-architecture-model/4_perspectives/4_1_security_perspective/4_1_6_usage_control#data-provenance-tracking) architecture model
- the [Provenance & Traceability](https://dssc.eu/space/BVE/357075283/Provenance+%26+Traceability) building block 
- [Value-Added Services](https://dssc.eu/space/BVE/357076468/Value-Added+Services) building block.
- [GAIA-X: Technical Architecture](https://www.bmwk.de/Redaktion/EN/Publikationen/gaia-x-technical-architecture.pdf?__blob=publicationFile&v=7) regarding data ecosystem in section 4.2 

**IDS Data Sharing and data exchange:** see [2.4 Data Exchange and Data Sharing](https://docs.internationaldataspaces.org/ids-knowledgebase/v/ids-ram-4/context-of-the-international-data-spaces/2_1_data-driven-business_ecosystems/2_4_data_exchange_and_data_sharing).


## Input / Output Data
Input data:\
- ContractID
- Incentive-distributions
- DataId
- PrevRoot
- DataType

The output of data type is inform of JSON format:\
![node-data](diagrams/node-data.png)

### Data Value Chain Tracker visualization

- visualization of value tracking for provider of raw data:

![data-chain-visualization-participant 1](diagrams/dvct-viz-1.png)

- Visualization of value tracking for provider of concatenated data:

![data-chain-visualization-participant 2](diagrams/dvct-viz-2.png)

- Visualization of value tracking for provider of final data:

![data-chain-visualization-participant 3](diagrams/dvct-viz-3.png)

### Data Value Chain Tracker digital incentives distribution
The distribution of digital incentives distribution should be based on the contract defined by the use case orchestrator. 

## Architecture

<!-- TODO -->


## Dynamic Behaviour

The sequence diagrams below describe possible DVCT to the basic B2B Connector flows.

_To be discussed with Félix and Robin_

```mermaid
---
title: Data Exchange for Data Value Chain Tracker
---

sequenceDiagram
    participant o as Orchestrator
    participant dp1 as Data provider 1
    participant pc1 as Connector of Data provider 1
    participant dvct-p1 as DVCT of Data provider 1
    participant dp2 as Data provider 2
    participant pc2 as Connector of Data provider 2
    participant dvct-p2 as DVCT of Data provider 2
    participant evs as External Veracity Attestation Service
    participant cat as Catalogue Service
    participant cc1 as Consumer Connector 1
    participant dvct-c1 as DVCT of Data consumer/AI provider 1
    participant c1 as Consumer/AI provider 1
    participant cc2 as Consumer Connector 2
    participant dvct-c2 as DVCT of Data consumer/AI provider 2
    participant c2 as Consumer/AI provider 2

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
