# Data Value Chain Tracker BB Design Document

The Data Value Chain Tracker (DVCT from now on) building block is a sophisticated system that monitors the direct and indirect use of data and distribute digital incentive for the data usage. it is based on a set of regulations, contractual requirements, and an immutable and distributed database that together form a robust infrastructure for traceable data exchange and value co-creation. DVCT not only ensures auditability and traceability of data usage but also enables organizations and individuals to see the value of their data.

As data provider or data owner, organization and individual can use DVCT to find out which use case(s), when, how, and by whom their data was used, as well as what other data affected the process of making new data type/items (chain data or visualization data).

## Conceptual Overview

According to Latif et al. (2009), there are three different types of data that contribute to the creation of the value chain. These are raw data, linked or chain data and human readable data. By identifying these three types of data, the DVCT can create the chain based on the previous root and child nodes of each data type.

<img src="diagrams/linked-data-value-chain.png" width="500">
source: Linked data value chain (Latif et al., 2009)


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
| Participant (Use Case Orchestrator or data consumer) sets number of point(s) for data usage in the contract                                                                   | Interaction with the contract, the digital wallet of the point/token giver and distribution of point based on the contract (point sources, who will get the point, and number of point to distribute)                                              |
| Data providers want to know where their data was used                                                                                         | Read the json data node, interact with the data visualization to create the value chain three                                                                |                                    | AI Provider join a use case                                                                                         | Read use case contract to get information about incetives for AI provider to join a use case    |  

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
- [JSON-LD](https://json-ld.org/) for data interconnection
- [ISO 8601](https://en.wikipedia.org/wiki/ISO_8601) for Date and time format

### Mapping to Data Space Reference Architecture Models

**DSSC** - based on DSSC, this Building block is part:
- [Data Provenance Tracking](https://docs.internationaldataspaces.org/ids-knowledgebase/v/ids-ram-4/perspectives-of-the-reference-architecture-model/4_perspectives/4_1_security_perspective/4_1_6_usage_control#data-provenance-tracking) architecture model
- the [Provenance & Traceability](https://dssc.eu/space/BVE/357075283/Provenance+%26+Traceability) building block 
- [Value-Added Services](https://dssc.eu/space/BVE/357076468/Value-Added+Services) building block.
- [GAIA-X: Technical Architecture](https://www.bmwk.de/Redaktion/EN/Publikationen/gaia-x-technical-architecture.pdf?__blob=publicationFile&v=7) regarding data ecosystem in section 4.2 

**IDS Data Sharing and data exchange:** see [2.4 Data Exchange and Data Sharing](https://docs.internationaldataspaces.org/ids-knowledgebase/v/ids-ram-4/context-of-the-international-data-spaces/2_1_data-driven-business_ecosystems/2_4_data_exchange_and_data_sharing).


## Input / Output Data
Input data:
- ContractID
- IncentiveDistributions
- DataId
- PrevRoot
- DataType

**The output of data type is inform of JSON format:**
<img src="diagrams/node-data.png" width="350">

### Data Value Chain Tracker visualization

- visualization of value tracking for provider of raw data:
<img src="diagrams/dvct-viz-1.png" width="350">

- Visualization of value tracking for provider of chain data:
<img src="diagrams/dvct-viz-2.png" width="350">

- Visualization of value tracking for provider of final data:
<img src="diagrams/dvct-viz-3.png" width="350">

### Data Value Chain Tracker digital incentives distribution
The distribution of digital incentives distribution should be based on the contract defined by the use case orchestrator. 

## Architecture

_To be discussed with Félix and Robin_

### Component Descriptions:
1. **DataProvider:** Entities that supply data to the system.
2. **DataConsumer:** Entities that use data provided by DataProviders.
3. **DVCT_Core:** Central logic component that tracks data usage, creates data nodes and chains, and distributes digital incentives.
4. **Blockchain or any immutable database:** Ensures data immutability and transaction verification.
5. **Database:** Stores non-blockchain data records and manages queries.
6. **UserInterface:** Provides visualizations of data lineage, data usages information, points/token information and manages user interactions.
7. **ContractManagement:** Manages digital contracts that define incentive models.
8. **API_Gateway:** Manages all incoming and outgoing API requests and handles user authentication.
9. **Incentive Engine:** Handles the calculation and distribution of tokens or points as per contractual agreements.
10. **Logging and Monitoring:** Records system activities and monitors performance to ensure optimal operation and aid in troubleshooting.
11. **Error Handling and Recovery:** Implements strategies to manage system errors and restore normal operations after failures, ensuring system resilience and reliability.

```mermaid
---
title: Architecture components
---
classDiagram
    class DataProvider {
        +Provide data()
        +Update data()
    }
    class DataConsumer {
        +Request data()
        +Receive data()
    }
    class DVCT_Core {
        +Track data usage()
        +Create data nodes()
        +Create chains()
    }
    class Blockchain {
        +Store immutable records()
        +Verify transactions()
        +Handle token transactions()
    }
    class Database {
        +Store data records()
        +Query data()
    }
    class UserInterface {
        +Display data lineage()
        +Manage user accounts()
    }
    class ContractManagement {
        +Manage contracts()
        +Define incentive models()
    }
    class IncentiveEngine {
        +Calculate incentives()
        +Distribute tokens or points
    }
    class API_Gateway {
        +Route requests()
        +Authenticate users()
    }
    class LoggingMonitoring {
        +Log operations()
        +Monitor system performance()
    }
    class ErrorHandlingRecovery {
        +Handle system errors()
        +Recover from failures()
    }

    DataProvider --|> DVCT_Core : provides data to
    DataConsumer --|> DVCT_Core : consumes data from
    DVCT_Core --|> Blockchain : uses
    DVCT_Core --|> Database : uses
    DVCT_Core --|> UserInterface : outputs to
    DVCT_Core --|> ContractManagement : interacts with
    DVCT_Core --|> IncentiveEngine : uses
    API_Gateway --|> DVCT_Core : interfaces with
    UserInterface --|> API_Gateway : connects through
    ContractManagement --|> Blockchain : records contracts on
    IncentiveEngine --|> ContractManagement : gets rules from
    IncentiveEngine --|> Blockchain : records transactions on
    DVCT_Core --|> LoggingMonitoring : uses for logging
    DVCT_Core --|> ErrorHandlingRecovery : uses for managing errors
```
for the initial implementation, immutable database non-blockchain will be used before the wallet BB is ready.

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
To make the diagram smaller, more manageable parts, ensuring it remains comprehensible and easy to follow on smaller screens, we devided the process into different main processes:

- **Part 1:** Initiating Data Exchange and Basic Data Handling
```mermaid
sequenceDiagram
    participant o as Orchestrator
    participant cat as Catalogue Service
    participant dp1 as Data provider 1
    participant dp2 as Data provider 2
    participant pc1 as Connector provider 1
    participant pc2 as Connector provider 2
    participant cc1 as Connector Consumer 1
    participant cc2 as Connector Consumer 2
    participant c1 as Consumer/AI provider 1
    participant c2 as Consumer/AI provider 2

    activate cat
    o ->>+ cat: Define use case, data flow & points distribution
    dp1 ->>+ cat: Join use case
    dp2 ->>+ cat: Join use case
    c1 ->>+ cat: Join use case
    c2 ->>+ cat: Join use case
    cat -->>- pc1: Provide contract and data exchange information
    cat -->>- pc2: Provide contract and data exchange information
    cat -->>- cc1: Provide contract and data exchange information
    cat -->>- cc2: Provide contract and data exchange information
    deactivate cat

```

- **Part 2:** Data Usage and Node Creation
```mermaid
sequenceDiagram
    participant pc1 as Connector provider 1
    participant dp1 as Data provider 1
    participant cc1 as Connector Consumer 1
    participant c1 as Consumer/AI provider 1
    participant dvct-c1 as DVCT consumer/AI provider 1
    participant cot as Contract Service

    cc1 ->> pc1: Data request (with contract)
    pc1 ->> cot: Verify contract
    cot -->> pc1: Verified contract & policies
    pc1 ->> dp1: Request data
    dp1 -->> pc1: Provide raw data DP1
    pc1 -->> cc1: Transfer data DP1
    cc1 ->> c1: Consume data DP1
    cc1 ->>+ dvct-c1: Trigger data consume DVCT
    cc1 ->> dvct-c1: Get DP1 metadata info
    dvct-c1 ->> dvct-c1: Create Node based on DP1 metadata

```

- **Part 3:** Incentive Distribution and Chain Update
```mermaid
sequenceDiagram
    participant dvct-c1 as DVCT consumer/AI provider 1
    participant dw1 as Orchestrator wallet
    participant dw-c1 as Wallet Consumer 1
    participant dw-p1 as Wallet Provider 1
    participant dp1 as Data provider 1
    participant dvct-p1 as DVCT provider 1
    participant cc1 as Connector Consumer 1

    dvct-c1 ->> dw1: Request point(s) based on contract
    dw1 -->> dvct-c1: Provide point(s)
    dvct-c1 ->> dw-c1: Distribute point(s)
    dvct-c1 ->> dw-p1: Distribute point(s)
    dvct-c1 ->> cc1: Request update to prevRoot based on data output
    cc1 ->> dp1: Send request and prevRoot node(s) data
    dp1 ->> dvct-p1: Update chain data, check existence
    dvct-p1 ->> dvct-p1: Handle Node creation or update
```

## Configuration & Deployment Settings
The configuration and deployment setting for Data Value Chain Tracker (DVCT), consist of:
1. Repository Setup: the source code will be hosted on GitHub or GitLab, allowing for version control and collaborative development.
2. Configuration Management: Environment variables for sensitive or environment-specific settings (e.g., database credentials) should be centralized in specific files, employ configuration files (like config.json, .env, or YAML files) to manage application settings, which can be easily adjusted without changing the code.
3. Dependency Management: Utilize a package manager such as npm for JavaScript or pip for Python to manage libraries and their versions. a requirements.txt or package.json file should be included to automate the installation of dependencies.
4. Database Configuration: Set up a relational or NoSQL database with scripts for initialization and migration. Tools like Docker can be used to containerize database environments, enhancing portability and consistency across development, testing, and production environments.
6. Deployment:Use continuous integration/continuous deployment (CI/CD) pipelines via GitHub Actions, to automate testing and deployment. Use container orchestration tools like Kubernetes or Docker Swarm.
7. Monitoring and Maintenance: Implement logging and monitoring using tools like Prometheus, Grafana, or ELK Stack to keep track of the system’s health and performance. Regular updates and security patches to dependencies should be managed through the chosen package managers and monitored via the CI/CD pipeline.


## Third Party Components & Licenses

- Immutable Database:
Component: Use an immutable database like Apache Cassandra or a blockchain-based storage solution.
License: Apache Cassandra is available under the Apache License 2.0, which allows commercial use, modification, distribution, and private use.

- MongoDB Node.js Library:
Component: MongoDB Node.js driver for database operations.
License: The MongoDB Node.js library is released under the Apache License 2.0.

- Open Source Blockchain:
Component: Hyperledger Fabric or Ethereum for blockchain functionalities.
License: Hyperledger Fabric: Available under the Apache License 2.0.
Ethereum: Most tools and libraries in the Ethereum ecosystem are open-source, typically under the MIT License, which allows for free use, modification, and distribution.


## Implementation Details

<!-- TODO -->


## OpenAPI Specification

<!-- TODO -->


## Test Specification

### Test Plan
The test plan for the Data Value Chain Tracker (DVCT) aims to ensure the system's integrity and performance through a comprehensive approach. It includes correctness tests for accurate data representation, reliability tests for system stability and data integrity, tests data immutability and scalability, back and forward tracking tests to verify accurate data lineage, and incentives distribution tests to ensure compliance and fairness based on contractual agreements.

### back and forward chain tracking
Back and forward chain tracking in the context of the Data Value Chain Tracker (DVCT) refers to the system's ability to trace data usage throughout its lifecycle. Forward tracking enables monitoring of how data is used, transformed, or combined from its initial state to subsequent states, including indirect usages in various use cases. It helps determine where, when, and in which use case the data was utilized.

Backward tracking, on the other hand, allows tracing back to the data's origin up to three levels, identifying the primary source and any intermediate stages it has passed through. This feature ensures transparency and accountability in data handling, allowing stakeholders to see both the downstream implications of data they provide and the upstream origins of data they use. This capability is critical for auditability, compliance, and verifying the integrity of data transformations and linkages in complex systems.

### Integration Tests
These tests will check the interactions between DVCT and external systems like the Data Space Connector and Contract Service to ensure data flows correctly through the system and meets all business requirements.

### Incentives Distribution Tests:
Test the logic and execution of digital incentives distribution to ensure it complies with the contractual agreement. Simulate various contractual scenarios to ensure incentives are calculated and distributed accurately and transparently.

### Reference

- Latif, A., Saeed, A. U., Hoefler, P., Stocker, A., & Wagner, C. (2009, September). The Linked Data Value Chain: A Lightweight Model for Business Engineers. In I-SEMANTICS (pp. 568-575). 
