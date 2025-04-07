# Data value chain tracker BB

# Design Document

See the design document [here](docs/design-document.md).

# Building instructions
DVCT requires to build&start services like: core-api, core-frontend, hardhat, incentive-api, incentive-frontend, incenti-trace alongside mongodb

RUN **yarn initialize**

RUN **make build-all** 

## Running instructions
RUN **make up**
- **core-frontend**: provides the data visualisation of nodes (listens on port 3000)
- **core-api**: serves the endpoints or backend resources
- **incenti-trace**:  constructs the traceability and incentive-mechanism by exposing an endpoint (POST /run-script) which can be called by a third party
- **incentive-api**: starts a server by exposing an endpoint (**POST /api/incentives/distribute**) that executes the distribution of points (tokens)
- **incentive-frontend**: provides detailed information of the predefined use-cases higlighted in ./blockchain/script folder which are then deployed and presented in the UI
- **hardhat**: provides the infrastructure for building, testing and deploying smart contracts on the ETH blockchain
- **mongodb**: database where information is kept and saved

## Example usage
For more detailed information, please check the [swagger](http://localhost:3001/api-docs/) (be sure that services are running)

| Endpoint                | HTTP Method | Params                        | Request Payload                                                                                                            | Result   |
|-------------------------|-------------|-------------------------------|----------------------------------------------------------------------------------------------------------------------------|----------|
| /api/node               | POST        | none                          | [input](https://github.com/Prometheus-X-association/data-value-chain-tracker/blob/main/docs/design-document.md#input-data) | 201      |
| /api/data/{nodeId}      | GET         | {nodeId}, id of the node tree | none                                                                                                                       | 200      |
| /api/data/{nodeId}      | DELETE      | {nodeId}, id of the node tree | none                                                                                                                       | 200      |
| /api/data               | GET         | none                          | none                                                                                                                       | 200      |
| /api/node-tree/{nodeId} | GET         | {nodeId}, id of the node tree | none                                                                                                                       | 200      |





## TLDR FOR TESTERS

We have created integration tests for the three scenarios in our design document.
They can be run with the following command:

- `yarn test:integration` (PS: Is quite slow)

To run all the components together in docker, run the following command:

- `make up`

If needed, more commands and specifics are documented below.

## DVCT Core components

### DVCT Core server

- **Link to Documentation**: [docs](app/express-server/Readme.md)

### DVCT Core mongodb

DVCT Core server uses mongodb to store data.

### DVCT Core frontend

This is the React frontend application.

- **Link to Documentation**: [TBD]()

## [DVCT Incentive Blockchain](./incentive/blockchain/)

The blockchain component uses Foundry and Hardhat for development and testing. Key contracts include:

- **PTXToken**: An ERC-20 token with an ERC20Permit extension used for incentive distribution
- **UseCaseContract**: Handles use case creation and reward distribution based on shares and fixed rewards

Link to generated smart contract documentation: [docs](./incentive/blockchain/docs/src/src/README.md)

### PTX Token

Note:

- The PTX Token is a simple ERC20 smart contract.
- All tokens are minted to the contract creator (subject to change).
- Has a wrapper for transfer so that we can track distribution using the RewardTransfer event.

### UseCaseContract

Read the generated documentation for a complete overview.

The UseCaseContract manages the creation and reward distribution for use cases. Each use case has its own configuration and participants. Key features include:

#### Use Case Creation

Use cases can be created with:

- A unique identifier
- Optional initial participants with reward shares
- Optional fixed reward amounts per participant
- Initial reward pool (can be topped up later)

The contract owner can:

- Create new use cases
- Transfer use case ownership
- Update/replace participant reward shares
- Add fixed rewards
- Manage the reward pool

#### Reward Distribution

The contract implements a flexible reward distribution system:

- **Reward Shares**: Participants can be assigned percentage shares (in basis points, where 10000 = 100%)
- **Fixed Rewards**: Additional fixed amounts can be allocated to specific participants
- **Reward Pool**: A pool of PTX tokens that can be:
  - Deposited during creation
  - Topped up later
  - Distributed according to shares and fixed rewards
  - Claimed by participants when unlocked

#### Lock Duration

Rewards can be locked for a specified time by the use case owner.
Valid durations:

- Minimum 1 day
- Maximum 365 days

The lock duration allows the use case owner to control when participants can claim their rewards.

#### Security Features

The contract includes several security measures:

- Access Control: Only use case owners can modify their use cases
- Reentrancy Protection: Uses OpenZeppelin's ReentrancyGuard
- Input Validation: Comprehensive checks for parameters like shares and reward amounts
- Safe Token Transfers: Uses OpenZeppelin's SafeERC20 for token operations
- Emergency withdrawal of reward pool if contract is not locked yet (only use case owner)

### Scripts

Workspace:

- `yarn start:node` - starts the local hardhat node

Project:

- `yarn ptx-deploy` - Deploys the contracts to the local hardhat network
- `yarn ptx-deploy-test` - Deploys contracts and a test environment where many transactions has been made. Useful for frontend development.
- `yarn export-abis` - Export the contract abis to the incentive frontend
- `yarn export-abis-to-api` - Export the contract abis to the incentive api
- `yarn docs` - generates solidity docs using forge
- `yarn clean` - cleans the hardhat workspace

## [DVCT Incentive Frontend](./incentive/frontend/)

Built using Next.js, Tailwind CSS, Shadcn, wagmi, viem. Providing interfaces for:

- Use case management
- Reward distribution monitoring
- Claiming rewards
- See balances and other statistics

Right now this is a simple website that lets you connect your wallet. From you wallet you will get an overview of your created use cases, use cases you have participated in, and all use cases. From there you can enter a specific use case. Here you will get information about the remaining reward pool, pausing, lock duration etc. You will see all participants, and how they have participated. Participants will be able to claim their reward when the lock is finished. Owner will be able to revert (single or batch) rewards, if the lock is still up. Plus some other small things.

You will also be able to create a use case in this UI. This is in development. This will most likely not be something you do through this UI, but rather in the overall Use Case creation process. Hopefully, this ui can provide a good starting point for the developers of the use case form.

### Scripts

Workspace:

- `yarn start:incentive:frontend` - starts the next.js app

## [DVCT Incentive API](./incentive/api/)

The API provides endpoints for:

- Secure reward distribution
- Historical data access (TBD)
- Real-time information (TBD)
- Aggregated statistics (TBD)

We did have some mock endpoints for the information api's, but I removed those, as I don't see their use. We should create proper history and statistics api's for what is going on in the api, and what is going on in the blockchain. This has been down prioritized to focus on the main functionality.

### Endpoints

- `api/incentives/distribute`

### How it works

The aim of the incentive api is to provide simple access to the smart contracts through a normal api, but still retaining the security. For this we have created a **KeyManagementService**. It manages client authentication and authorization through public-key cryptography.

**KeyManagementService** overview:

- Generates 2048-bit RSA key pairs
- Associates keys with client IDs
- Stores public keys and permissions
- Returns private key for client distribution (centralized management)
- Validates if clients have specific permissions
- Clint management (public key retrival, access revocation etc)

**IKeyStorage**: Interface used for the storage implementation. We will probably use a cloud-based secure key-value vault in production. We created this interface so that it is easy to swap storage solutions. Right now we have only implemented a **FileKeyStorage**, used for testing.

**IncentiveService**: This is the core incentive distribution service. This handles a request by validating the request, verifying the signature, and if all is good, then submits the transaction to the blockchain. Meaning that the wallet connected to the incentive api is paying for gas. This is to be seen as a direct operational cost, and can be reduced by using the **notifier** concept we discussed above.

### Tools/clients

**Incentive signer**: We have created a a client library that exposes a signer, so that it is easy for clients to create a signature that matches what we expect in the api. This needs to be signed with the private key that we provide to them.

**addClient script**: This is a simple script used to add new clients. Just for ease-of-use. It uses the local FileStorage implementation.

### Scripts

Workspace:

- `yarn start:api` - starts the express server
- `yarn build:api` - builds the api

## Testing

### Prerequisites

- Node.js >= 18.0.0
- Yarn or npm
- [Forge](https://book.getfoundry.sh/getting-started/installation) (if you want to run the blockchain unit tests)

Run `yarn deps` to install all dependencies. Or `npm run deps-npm` if you are using npm.

### E2E testing

- `yarn test:integration:only` (assumes you have node running)
- `yarn test:integration` (runs hardhat node concurrently)

### Integration tests

- `test:blockchain:hardhat` (integration like hardhat test for the smart contracts)

### Unit tests

- `test:blockchain:forge` (unit tests that tests the smart contracts)
- `test:incentive:api` (unit tests for the incentive api)

### Unit testing
LOCATION: app/express-server/src/tests/api.test.js

#### Setup test environment
- **cd app/express-server**
- run **"npm install"**
- make sure all components are running, especially mongodb (**make up**)
  
#### Run tests
 - in app/express-server run **"npm test"**
   
#### Expected results
<img width="480" alt="image" src="https://github.com/user-attachments/assets/c6a17711-ce2c-4886-b275-e6708c56cec6" />


### Component-level testing
REFERENCE: **"incenti-trace"** defined in the docker-compose.yml of project root (data-value-chain-tracker)
#### Setup test environment
- run **"yarn initialize"**
- run **"make up"**
#### Run tests
- call **POST http://localhost:3004/run-script**
- PAYLOAD fixed for traceability property, but flexible towards the number of participants taking part in the use-case:
  ```json
  {
  "traceibility":
	  {
		  "dvctId": "string",
		  "usecaseContractId": "string",
		  "usecaseContractTitle": "string",
		  "extraIncentiveForAIProvider": {
			  "numPoints": 0,
			  "factor": 0,
			  "factorCheck": true
		  },
		  "contractId": "string",
		  "dataId": "string",
		  "dataProviderId": "2134",
		  "dataConsumerId": "2135",
		  "dataConsumerIsAIProvider": true,
		  "prevDataId": [""],
		  "incentiveForDataProvider": {
			  "numPoints": 0,
			  "factor": 0,
		  "factorCheck": true
	  }
  },
  "reachEndFlow": true,
  "providerUrl": "http://localhost:8543",
  "useCaseID":"13532",
  "useCaseName": "corporate-training-multi-provider",
  "data-id": "iqwe80123oiu",
  "data-Quality-Check": "yes",
  "participantShare":[{
        "partipicantName":"Organization A",
        "rewardDepositor": "false",
        "role":"Data-Provider", 
        "participantID": "2134",
        "participantWallet": "0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a",
        "numOfShare": 3000
      },
      {
        "partipicantName":"Organization B",
        "rewardDepositor": "false",
        "role":"AI-Provider-1",
        "participantID": "2135",
        "participantWallet": "0x8b3a350cf5c34c9194ca85829a2df0ec3153be0318b5e2d3348e872092edffba",
        "numOfShare": 2000
     },
    {
      "partipicantName":"Organization C",
      "rewardDepositor": "false",
      "role":"AI-Provider-2",
      "participantID": "2135",
      "participantWallet": "0x92db14e403b83dfe3df233f83dfa3a0d7096f21ca9b0d6d6b8d88b2b4ec1564e",
      "numOfShare": 2000
    },
    {
      "partipicantName":"Organization D",
      "rewardDepositor": "false",
      "role":"Service-Provider",
      "participantID": "2135",
      "participantWallet": "0x4bbbf85ce3377467afe5d46f804f221813b2bb87f24d81f60f1fcdbf7cbf4356",
      "numOfShare": 1500
    },
    {
      "partipicantName":"Organization E",
      "rewardDepositor": "true",
      "role":"Orchestrator",
      "participantID": "Orchestrator",
      "participantWallet": "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
      "numOfShare": 1500
    }]}
#### Expected results
<img width="571" alt="image" src="https://github.com/user-attachments/assets/c2ffa528-ae50-4b13-b103-2f51adbffcb1" />
.
.
.
<img width="700" alt="image" src="https://github.com/user-attachments/assets/c1e421fe-7c70-4cf3-b18d-e261de80e047" />


## Makefile Commands

The following commands can be used to manage the services defined in `docker-compose.yml`.

### Prerequisites

Make sure you have the following installed on your machine:

- [Docker](https://docs.docker.com/get-docker/)
- [Docker Compose](https://docs.docker.com/compose/install/)
- [Make](https://www.gnu.org/software/make/)

### `make up`

Starts all services defined in the Docker Compose file.

```bash
make up
```

### `make down`

Stops all services defined in the Docker Compose file.

```bash
make down
```

### `make clean`

Cleans up containers, networks, and volumes created by Docker Compose.

```bash
make clean
```

### `make logs`

Displays logs for all services defined in the Docker Compose file.

```bash
make logs
```

### Individual Builds

- `make build-core-frontend` - Builds the core frontend Docker image
- `make build-core-api` - Builds the core API Docker image
- `make build-incentive-api` - Builds the incentive API Docker image
- `make build-incentive-frontend` - Builds the incentive frontend Docker image
- `make build-hardhat` - Builds the Hardhat node Docker image# Individual ddimage build commands

## Frontend pictures

![dashboard](pictures/dashboard.png)
![use-case-overview](pictures/use-case-overview.png)
![use-case-participants](pictures/use-case-participants.png)
![use-case-deposit](pictures/use-case-deposit.png)
![use-case-manage](pictures/use-case-manage.png)
![create-use-case](pictures/create-use-case.png)
