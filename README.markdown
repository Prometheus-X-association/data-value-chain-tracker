# Data Veracity Assurance BB Design Document

The Data Veracity Assurance (DVA from now on) building block allows data exchange participants to agree on and later prove/verify quality requirements or properties of the exchanged data.

For example, if a data producer (abbreviated P from now on) provides simple sensor data to a data consumer (C from now on), the DVA BB can facilitate P to prove (and C to verify) that the provided data is credible (eg temperature values are within a certain range).

The DVA BB requires a **veracity level agreement** between the exchange participants.
The agreement is made for a specific data exchange unit, as per the contract.
The agreement defines a number of **veracity objectives** that each describe a data quality aspect (eg completeness or accuracy) and an evaluation schema (eg value is within a numerical range).
When the data exchange occurs, in the simplest model, P attaches a proof (or at least an attestation) regarding the exchanged data’s quality that C trusts or can verify.


## Conceptual Overview

![Metamodel](diagrams/dva-concept-meta.png)

### Example

![Example Instance Model](diagrams/dva-concept-instance.png)


## Technical Usage Scenarios & Features

### Features/Main Functionalities

Key functionalities:
1. Manage data veracity level agreements
2. Provide means to verify the veracity of exchanged data
3. Log results of verification

DVA also potentially enables proving/verifying such properties about the shared data that are related to additional, sensitive (eg due to GDPR) data, without disclosing them (possibly using zero-knowledge proofs).

### Technical Usage Scenarios

With DVA, data exchange participants can be assured that the data fulfils predefined quality requirements.

#### Management of Veracity Level Agreements

<!-- TODO -->

#### Proving & Attestation of Veracity

<!-- TODO -->

#### Logging of Results

<!-- TODO -->


## Requirements

* **`[BB_08__01]`** DVA MUST define schemata for Data Veracity Agreements
* **`[BB_08__02]`** DVA MUST support striking Data Veracity Agreements through the Catalogue
* **`[BB_08__03]`** DVA MUST provide multiple veracity assurance methods
* **`[BB_08__03]`** DVA MUST support veracity attestation (ie either provider or a third party attests that veracity requirements are met
* **`[BB_08__04]`** DVA SHOULD support veracity self-attestation
* **`[BB_08__05]`** DVA SHOULD support third-party veracity attestation
* **`[BB_08__06]`** DVA SHOULD support provider-proven veracity
* **`[BB_08__07]`** DVA SHOULD support consumer-verified veracity
* **`[BB_08__08]`** DVA SHOULD interface with the Contract service
* **`[BB_08__09]`** DVA SHOULD interface with the Connector


## Integrations

### Direct Integrations with Other BBs

_No direct integrations identified as of yet._


### Integrations via Connector

* DVA will likely have to directly integrate with the **Connector** itself to extend data exchange flows with veracity assurance steps
* As veracity level agreements are similar to contracts (or will become part of the contracts), DVA will have interactions with the **Contract** component
* Potential integrations with **Consent** as well (?)
* Most likely, DVA will integrate closely with the **Data Value Chain Tracker** BB
  * The _value_ is strongly related to the quality of the data assured by DVA


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

_To be discussed with Félix_

```mermaid
---
title: Data Exchange with Attestation of Veracity
---

sequenceDiagram
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
