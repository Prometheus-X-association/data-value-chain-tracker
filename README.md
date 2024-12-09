# Data value chain tracker BB

See the design document [here](docs/design-document.md).

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

- **PTXToken**: An ERC-20 token used for incentive distribution
- **UseCaseFactory**: Factory contract for creating and managing use cases
- **UseCaseContract**: Handles individual use case logic and reward distribution

Link to generated smart contract documentation: [docs](./incentive/blockchain/docs/src/README.md)

### PTX Token

Note:

- The PTX Token is a simple ERC20 smart contract.
- All tokens are minted to the contract creator (subject to change).
- Has a wrapper for transfer so that we can track distribution using the RewardTransfer event.

### UseCaseFactory

Read the generated documentation for a complete overview.

The use case factory is a standard factory pattern contract, and is used to
create other UseCaseContract's.

**Operators** are admins that can manage the notifiers. By default the owner of
the contract (address that deployed it) is the only operator. Right now only the owner can add and remove operators. Operators will have access to manage the UseCaseFactory.

**Global notifiers** are addresses that are allowed to notify reward distribution events to the UseCaseContract. **Operators** can add and remove **Global notifiers**.

**Use case notifiers** are addresses that are allowed to notify reward distribution events for specific use case contracts. **Operators** can add and remove **Global notifiers**.

Hierarchy: Owner -> Operators -> Notifiers (Global/Use case specific)

The reason the access control system is like this:

- Clear seperation of responsibilities and minimize risk if any single role is compromised.
- Owner retains ultimate control
- Use case specific notifiers provide granular control, allowing different teams or sevices to manage their own use cases.
- As the ecosystem grows, the work of granting accesses can be shared.

It should be noted that at the Incentive api will be the only GlobalNotifier to begin with. It will handle its own security internally. This access control system is meant for systems that would like to talk directly with the smart contracts instead of going through the Incentive API.

The only other important aspect of the factory contract is that it creates the use case. When creating the use case it expects a `rewardPoolAmount` as a parameter. It then tries to transfer PTX tokens from `sender` wallet to the use case contract before succesfully returning. We expect that the UseCaseContract should have some initial rewards. We want this to be transparent. We want providers to see available rewards in the contract. The `sender` can also top up the reward pool, but we will talk about that further down.

### UseCaseContract

For each use case, if the orchestrator wish to use the incentive distribution module, we will create a UseCaseContract smart contract. This controls the incentive distribution for that single use case. Some aspects of this contract:

#### Lock duration

Rewards can be locked for a specified time, if wanted, by the use case owner.
Valid durations:

- No lock (0)
- Minimum 1 hour (subject to change)
- Maximum 30 days (subject to change)

The point of the lock duration is for the use case owner to be able to revert certain rewards if needed. After the lock duration has passed, the participants of the use case, are able to claim their rewards.

### Action cooldown

This is a security feature where the owner is able to withDrawUnusedRewards (remaining reward pool), but is limited to doing this once a day.

### Pause

The owner can also pause the smart contract. This means it will no longer be possible to notify the UseCase of events that has happened. A security feature like the action cooldown above. In hindsight this gives the owner the ability to pause the contract forever, rendering the action cooldown less important. These are things that can be changed and talked about. But having a trusted, quite centralized system to begin with might be a good idea for security. We can always make these things optional/adjustable, so that each use case orchestrator can adjust the level of control they have.

### Top up

The owner can top up the reward pool when he wants to. I think this is an important feature as he does not necessarily have the entire reward pool available upon use case contract creation.

### Events

The UseCaseContract keeps some metadata about the events and their respective base reward. This is defined upon contract creation by the use case orchestrator. This is not necessarily a security feature, more a transparancy, and useful feature. Based on the event that is notified (by a verified notifier), we will use the base reward for the reward amount to the participant.

### Factor

When a notifier notifies that an event has triggered he will have to submit a factor. Right now this is a parameter to the function. We should consider using oracles for this in the future. This factor is basically just a number between 0.01 (1%) and 1 (100%), defining the factor of which the base reward will be multiplied. This system is entirely agnostic to this, and just accepts the factor as is. This will possibly be an aggregation of multiple steps before the event is submitted. This is the future we use to reduce the reward if the data quality is poor for example.

### Future thoughts:

- Maybe we should be able to reduce rewards instead of just reverting as owner?

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
