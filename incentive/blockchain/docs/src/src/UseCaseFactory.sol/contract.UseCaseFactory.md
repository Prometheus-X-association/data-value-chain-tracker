# UseCaseFactory
[Git Source](https://github.com/Prometheus-X-association/data-value-chain-tracker/blob/f5fc51f4370c215daf8b8d976e067a09a22686a3/src/UseCaseFactory.sol)

**Inherits:**
Ownable

Factory contract that creates and manages use case instances for reward distribution

*Handles access control for operators and notifiers, and manages use case creation*


## State Variables
### incentiveToken
The token used for rewards across all use cases


```solidity
address public immutable incentiveToken;
```


### useCaseContracts
Mapping of use case ID to its contract address


```solidity
mapping(uint256 => address) public useCaseContracts;
```


### nextUseCaseId
Counter for generating unique use case IDs


```solidity
uint256 public nextUseCaseId;
```


### operators
Operators can manage notifiers


```solidity
mapping(address => bool) public operators;
```


### globalNotifiers
Global notifiers can notify events for all use cases


```solidity
mapping(address => bool) public globalNotifiers;
```


### useCaseNotifiers
Use case specific notifiers


```solidity
mapping(uint256 => mapping(address => bool)) public useCaseNotifiers;
```


### MIN_REWARD_POOL
Minimum reward pool size for new use cases


```solidity
uint256 public constant MIN_REWARD_POOL = 100;
```


### VERSION
Current version of the factory contract


```solidity
string public constant VERSION = "1.0.0";
```


## Functions
### onlyOperator

Ensures caller is an operator or owner


```solidity
modifier onlyOperator();
```

### constructor

Initializes the factory with the reward token address


```solidity
constructor(address _incentiveToken) Ownable(msg.sender);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_incentiveToken`|`address`|Address of the ERC20 token used for rewards|


### addOperator

Adds a new operator


```solidity
function addOperator(address operator) external onlyOwner;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`operator`|`address`|Address to be added as operator|


### removeOperator

Removes an operator


```solidity
function removeOperator(address operator) external onlyOwner;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`operator`|`address`|Address to be removed from operators|


### addGlobalNotifier

Adds a global notifier


```solidity
function addGlobalNotifier(address notifier) external onlyOperator;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`notifier`|`address`|Address to be added as global notifier|


### createUseCase

Creates a new use case contract


```solidity
function createUseCase(
    uint256 lockDuration,
    string[] calldata eventNames,
    uint256[] calldata baseRewards,
    uint256 rewardPoolAmount
) external returns (uint256);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`lockDuration`|`uint256`|Duration rewards are locked before claiming|
|`eventNames`|`string[]`|List of event names for the use case|
|`baseRewards`|`uint256[]`|List of base rewards for each event|
|`rewardPoolAmount`|`uint256`||

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`<none>`|`uint256`|The ID of the newly created use case|


### canNotifyEvents

Checks if an address can notify events for a use case


```solidity
function canNotifyEvents(uint256 useCaseId, address notifier) public view returns (bool);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`useCaseId`|`uint256`|The ID of the use case|
|`notifier`|`address`|The address to check|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`<none>`|`bool`|bool True if the address can notify events|


### getUseCasesByOwner

Gets all use cases owned by a specific address


```solidity
function getUseCasesByOwner(address owner) external view returns (uint256[] memory useCaseIds);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`owner`|`address`|The address to check|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`useCaseIds`|`uint256[]`|Array of use case IDs owned by the address|


### getUseCaseAddresses

Gets the contract addresses for multiple use case IDs


```solidity
function getUseCaseAddresses(uint256[] calldata useCaseIds) external view returns (address[] memory addresses);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`useCaseIds`|`uint256[]`|Array of use case IDs|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`addresses`|`address[]`|Array of corresponding use case contract addresses|


## Events
### UseCaseCreated
Emitted when a new use case is created


```solidity
event UseCaseCreated(uint256 indexed useCaseId, address contractAddress, string[] eventNames, uint256[] baseRewards);
```

**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`useCaseId`|`uint256`|The unique identifier for the use case|
|`contractAddress`|`address`|The address of the newly created use case contract|
|`eventNames`|`string[]`|List of event names configured for the use case|
|`baseRewards`|`uint256[]`|List of base rewards corresponding to each event|

### OperatorAdded
Emitted when an operator is added


```solidity
event OperatorAdded(address indexed operator);
```

### OperatorRemoved
Emitted when an operator is removed


```solidity
event OperatorRemoved(address indexed operator);
```

### GlobalNotifierAdded
Emitted when a global notifier is added


```solidity
event GlobalNotifierAdded(address indexed notifier, address indexed addedBy);
```

### GlobalNotifierRemoved
Emitted when a global notifier is removed


```solidity
event GlobalNotifierRemoved(address indexed notifier, address indexed removedBy);
```

### UseCaseNotifierAdded
Emitted when a use case specific notifier is added


```solidity
event UseCaseNotifierAdded(uint256 indexed useCaseId, address indexed notifier, address indexed addedBy);
```

### UseCaseNotifierRemoved
Emitted when a use case specific notifier is removed


```solidity
event UseCaseNotifierRemoved(uint256 indexed useCaseId, address indexed notifier, address indexed removedBy);
```

