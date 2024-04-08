# Data Value Chain Tracker BB Design Document

The Data Value Chain Tracker (DVCT from now on) building block is a sophisticated system that monitors the direct and indirect use of data and distribute digital incentive for the data usage. it is based on a set of regulations, contractual requirements, and an immutable and distributed database that together form a robust infrastructure for traceable data exchange and value co-creation. DVCT not only ensures auditability and traceability of data usage but also enables organizations and individuals to see the value of their data.

As data provider or data owner, organization and individual can use DVCT to find out which use case(s), when, how, and by whom their data was used, as well as what other data affected the process of making new data type/items (chain data or visualization data).

## Conceptual Overview

According to Latif et al. (2009), there are three different types of data that contribute to the creation of the value chain. These are raw data, linked or chain data and human readable data. By identifying these three types of data, the DVCT can create the chain based on the previous root and child nodes of each data type.

![linked-data-value-chain](diagrams/linked-data-value-chain.png)
Linked data value chain (Latif et al., 2009)

Regardless of one's role in the use case, as a data provider (individual or organization) can provide raw data or chain data, but as a data consumer one will always use data and then also produce data, either as chain data that can be fed back into the ecosystem/use case partner or as final data in the form of result visualization analysis.

![data-type-usage](diagrams/data-type.png)

To encourage data sharing, digital incentives should be provided to the ecosystem. These digital incentives can be used to convert the "value" of data sharing into a valuable asset that can be used for various activities within the Promotheus-X (PTX) ecosystem. DVCT act as tool to distribute the digital incentives based on data usage of participants.

## Technical Usage Scenarios & Features

The main goal of the DVCT is to solve the problem of uncertainty about the value of data by providing an overview of data use, not only the direct use of data, but also the use of data after it has been refined, combined or analyzed with other data (indirect use). Data providers (individuals or organizations) get an overview of where their data is used and can obtain information about the value of their data in the ecosystem, this can help them to better negotiate their data and service offering. In addition, by tracking the use of data in the ecosystem, the DVCT will handle the distribution of digital incentive to the organizations that participate in the value co-creation of the data usage. 

An example of a use case is skills gap analytics, in which an organization as the use case orchestrator defines the use case including the data flow and digital incentives that will be distributed to use case participants in the contract. The services required for the skill gap analytics will include different data providers and AI providers who aim to improve the skills gap analytics by combining external data with internal skill data. Based on the use case, some technical usage scenario and role of the DVCT can be described in the table below:

| Process                                                                                                                                                  | DVCT role                                                                                                                                            |
|----------------------------------------------------------------------------------------------------------------------------------------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------|
| Use Case Orchestrator defines the use case (data flow, point distribution including where the point coming from, number of point(s) to provide, data/AI requirements)    | Extracting information from the contract about the data flow (participant's role, data usage and data type of data usage) and the distribution of points  |
| Data providers share data with data consumers/AI providers on the basis of the contract                                                                            | Interaction with the dataspace connector and contract service, generation of nodes and the chain after data consumption/usage                                                              |
| Data consumers/AI providers who consume data and bring the result of their AI service back into the ecosystem as aggregated data/chained data | Create and store immutable json data consisting of nodes that identify prevNode/rawdata and children                                                |
| participant (Use Case Orchestrator or data consumer) sets number of point(s) for data usage in the contract                                                                   | Interaction with the contract, the digital wallet of the point/token giver and distribution of point based on the contract (point sources, who will get the point, and number of point to distribute)                                              |
| Data providers want to know where their data is used                                                                                         | Read the json data node, interact with the data visualization to create the value chain three                                                                |                                                                                                          
### Features/Main Functionalities

Based on the DVCT objective and technical usage scenario, there are three key functionalities for the BB, the key functionalities are:
1. Track the history of direct and indirect data usage of shared data
2. Handle the distribution of digital incentives (in terms of points, tokens, badges, or labels) based on the contract.
3. Provide data for visualization of value chain tracking (forward and backward tracking).

## Requirements

Some requirements for the DVCT are based on the DVCT objectives, the technical usage scenario, the initial conceptual overview and GAIA-X and IDSA, including*:

* **`[BB_06__01]`** DVCT MUST support tracking direct and indirect data usage  
* **`[BB_06__02]`** DVCT MUST interface with the Contract
* **`[BB_06__03]`** DVCT MUST support distributed data storing the value chain data (data-usage history)
* **`[BB_06__04]`** DVCT SHOULD have access to points/token storage
* **`[BB_06__05]`** DVCT MUST store points/tokens and data-usage-history in immutable database
* **`[BB_06__06]`** DVCT SHOULD distribute points based on the contract 
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

- Visualization of value tracking for provider of chain data:

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
    participant dw1 as Orchestrator wallet

    participant dp1 as Data provider 1
    participant dw-p1 as Wallet Provider 1 
    participant pc1 as Connector provider 1
    participant dvct-p1 as DVCT provider 1

    participant dp2 as Data provider 2
    participant dw-p2 as Wallet Provider 2
    participant pc2 as Connector provider 2
    participant dvct-p2 as DVCT provider 2

    participant cot as Contract Service
    participant wal as Billing/Wallet Service
    participant cat as Catalogue Service

    participant dvct-c1 as DVCT consumer/AI provider 1
    participant cc1 as Connector Consumer 1
    participant dw-c1 as Wallet Consumer 1
    participant c1 as Consumer/AI provider 1

    participant dvct-c2 as DVCT consumer/AI provider 2
    participant cc2 as Connector Consumer 2
    participant dw-c2 as Wallet consumer 2 
    participant c2 as Consumer/AI provider 2
    
    Note over dw1: points/token available
    Note over dw-c1: points/token available
    Note over dw-c2: points/token available
    activate cat
    o -) cat: Trigger data exchange, trigger data exchange, define the use case, data flow & points distribution
    Note over cat: use case
    dp1 -) cat: join the use case
    cat -) pc1: contract and data exchange information
    dp2 -) cat: join the use case
    cat -) pc2: contract and data exchange information
    c1 -) cat: join the use case
    cat -) cc1: contract and data exchange information
    c2 -) cat: join the use case
    cat -) cc2: contract and data exchange information
    deactivate cat
    cc1 -) pc1: data request (with contract)
    pc1 -) cot: contract verification and policies
    cot -) pc1: verified contract & policies
    Note over pc1: policy verification & access control
    pc1 -) dp1: get data
    Note over dp1: Raw data DP1
    dp1 -) pc1: data
    pc1 -) cc1: data DP1
    Note over cc1: policy verification & access control
    cc1 -) c1: consume data DP1

    cc1 -) dvct-c1: data consume trigger DVCT
    dvct-c1 -) cc1: get DP1 information
    cc1 -) dvct-c1: DP1 metadata info
    dvct-c1 -) dvct-c1: [Node1] create Node based on DP1 metadata
    Note over dvct-c1: A node consist of metadata, prevRoot, and children
    dvct-c1 -) cc1: get data-type output [chain-data]
    cc1 -) dvct-c1: data-type output [chain data]
    dvct-c1 -) dvct-c1: [Node2] create Node based on data-type output defined in contract
    dvct-c1 -) dvct-c1: create chain between Node1 and Node2
    Note over dvct-c1: the chain = [Node1 is prevRoot of Node2]
    Note left of dvct-c1: visualization of chain between Node1 and Node2
    dvct-c1 -) cc1: get data for point distribution
    cc1 -) dvct-c1: data of point distribution

    dvct-c1 -) dw1: get point(s) as AI provider based on contract
    dw1 -) dw1: reduce point(s)
    dw1 -) dvct-c1: point(s)
    dvct-c1 -) dw-c1: distribute point
    dvct-c1 -) dw-c1: get point(s) for data usage
    dw-c1 -) dw-c1: reduce point(s)
    dw-c1 -) dvct-c1: point(s)
    dvct-c1 -) dw-p1: distribute point

    dvct-c1 -) cc1: request to update prevRoot(if any) based on data-output [Node2]
    cc1 -) dp1: send request and prevRoot node(s) data [Node1]
    dp1 -) dvct-p1: chain-data update request, check if Node1 is already exist
    alt is exist and has no prevRoot
        dvct-p1 -) dvct-p1: update Node
    else is exist and has prevRoot
        loop prevNodes
            dvct-p1 -) dvct-p1: update Node and send update request to all prevRoot
        end
    else is not exist
        dvct-p1 -) dvct-p1: create a new Node for Node1
    end

    cc2 -) pc1: data request (with contract)
    pc1 -) cot: contract verification and policies
    cot -) pc1: verified contract & policies
    Note over pc1: policy verification & access control
    pc1 -) dp1: get data
    Note over dp1: Raw data DP1
    dp1 -) pc1: data
    pc1 -) cc2: data DP1

    cc2 -) pc2: data request (with contract)
    pc2 -) cot: contract verification and policies
    cot -) pc2: verified contract & policies
    Note over pc2: policy verification & access control
    pc2 -) dp2: get data
    Note over dp2: chain data DP2 [Node2]
    dp2 -) pc2: data
    pc2 -) cc2: data DP2 [Node2]

    Note over cc2: policy verification & access control
    cc2 -) c2: consume data DP1 and DP2
    Note over c2: data-type output is visualized-data/final data

    cc2 -) dvct-c2: data consume trigger DVCT
    dvct-c2 -) cc2: get DP1 & DP2 information
    cc2 -) dvct-c2: DP1 & DP2 metadata info
    dvct-c2 -) dvct-c2: [Node1 and Node2] create Nodes based on DP1 & DP2 metadata
    Note over dvct-c2: A node consist of metadata, prevRoot, and children
    dvct-c2 -) cc2: get data-type output [visualized-data]
    cc2 -) dvct-c2: data-type output [visualized-data]
    dvct-c2 -) dvct-c2: [Node3] create Node based on data-type output defined in contract
    dvct-c2 -) dvct-c2: create chain between Node3 and prevNode [Node1 & Node2]
    Note over dvct-c2: the chain = [Node1 and Node2 are prevRoot of Node3]
    Note left of dvct-c2: visualization of chain between Node3 and prevRoot
    dvct-c2 -) cc2: get data for point distribution
    cc2 -) dvct-c2: data of point distribution

    dvct-c2 -) dw1: get point(s) as AI provider based on contract
    dw1 -) dw1: reduce point(s)
    dw1 -) dvct-c2: point(s)
    dvct-c2 -) dw-c2: distribute point
    dvct-c2 -) dw-c2: get point(s) for data usage
    dw-c2 -) dw-c2: reduce point(s)
    dw-c2 -) dvct-c2: point(s)
    dvct-c2 -) dw-p2: distribute point

    dvct-c2 -) cc2: request to update prevRoot(if any) based on data-output [Node3]
    cc2 -) dp2: send request and prevRoot node(s) data [Node1 and Node2]
    dp2 -) dvct-p2: chain-data update request, check if prevRoot node is already exist
    alt is exist and has no prevRoot
        dvct-p2 -) dvct-p2: update Node
    else is exist and has prevRoot
        loop prevNodes
            dvct-p2 -) dvct-p2: update Node and send update request to all prevRoot
        end
    else is not exist
        dvct-p2 -) dvct-p2: create a new Node for Node1
    end

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

<!-- TODO -->

### Unit tests

<!-- TODO -->

### Integration Tests

<!-- TODO -->

### Reference

- Latif, A., Saeed, A. U., Hoefler, P., Stocker, A., & Wagner, C. (2009, September). The Linked Data Value Chain: A Lightweight Model for Business Engineers. In I-SEMANTICS (pp. 568-575). 
