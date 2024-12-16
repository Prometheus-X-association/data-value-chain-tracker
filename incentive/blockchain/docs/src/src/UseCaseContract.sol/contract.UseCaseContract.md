# UseCaseContract
[Git Source](https://github.com/Prometheus-X-association/data-value-chain-tracker/blob/46cac2de8f2e7590f1792258a001516bd7e53e86/src/UseCaseContract.sol)

**Inherits:**
AccessControl, ReentrancyGuard

Manages reward distribution use cases with configurable participant shares and lockup periods

*Implements access control and reentrancy protection for secure reward management*


## State Variables
### MAX_PARTICIPANTS

```solidity
uint256 public constant MAX_PARTICIPANTS = 100;
```


### MAX_TOTAL_SHARES

```solidity
uint256 public constant MAX_TOTAL_SHARES = 10000;
```


### MIN_LOCKUP_PERIOD

```solidity
uint256 public constant MIN_LOCKUP_PERIOD = 1 days;
```


### MAX_LOCKUP_PERIOD

```solidity
uint256 public constant MAX_LOCKUP_PERIOD = 365 days;
```


### ptxToken
The PTX token contract used for reward distributions


```solidity
IPTXToken public immutable ptxToken;
```


### useCases
Mapping from use case ID to use case details


```solidity
mapping(string => UseCase) public useCases;
```


### participants
Mapping from use case ID to array of participants


```solidity
mapping(string => Participant[]) public participants;
```


### totalRewardShares
Mapping from use case ID to total reward shares


```solidity
mapping(string => uint256) public totalRewardShares;
```


## Functions
### constructor

Initializes the contract with the PTX token address


```solidity
constructor(address _ptxToken);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_ptxToken`|`address`|Address of the PTX token contract|


### createUseCase

Creates a new use case with the given ID


```solidity
function createUseCase(string calldata useCaseId) external;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`useCaseId`|`string`|Unique identifier for the use case|


### createUseCaseWithParticipants

Creates a new use case with initial participants and their reward shares

*Arrays must be of equal length, and total shares must not exceed MAX_TOTAL_SHARES*


```solidity
function createUseCaseWithParticipants(
    string calldata useCaseId,
    address[] calldata participants_,
    uint96[] calldata shares_,
    uint96[] calldata fixedRewards_
) external;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`useCaseId`|`string`|Unique identifier for the use case|
|`participants_`|`address[]`|Array of participant addresses|
|`shares_`|`uint96[]`|Array of reward shares in basis points for each participant|
|`fixedRewards_`|`uint96[]`|Array of fixed reward amounts for each participant|


### transferUseCaseOwnership

Transfers ownership of a use case to a new address


```solidity
function transferUseCaseOwnership(string calldata useCaseId, address newOwner) external;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`useCaseId`|`string`|The ID of the use case|
|`newOwner`|`address`|The address of the new owner|


### useCaseExists

Modifier to check if a use case exists


```solidity
modifier useCaseExists(string calldata useCaseId);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`useCaseId`|`string`|The ID of the use case to check|


### onlyUseCaseOwner

Modifier to restrict function access to use case owner


```solidity
modifier onlyUseCaseOwner(string calldata useCaseId);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`useCaseId`|`string`|The ID of the use case|


### depositRewards

Deposits rewards into a use case's reward pool


```solidity
function depositRewards(string calldata useCaseId, uint256 amount) external nonReentrant useCaseExists(useCaseId);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`useCaseId`|`string`|The ID of the use case|
|`amount`|`uint256`|The amount of tokens to deposit|


### depositRewardsWithPermit

Deposits rewards using EIP-2612 permit


```solidity
function depositRewardsWithPermit(
    string calldata useCaseId,
    address owner,
    uint256 amount,
    uint256 deadline,
    uint8 v,
    bytes32 r,
    bytes32 s
) external nonReentrant useCaseExists(useCaseId);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`useCaseId`|`string`|The ID of the use case|
|`owner`|`address`|The address of the owner|
|`amount`|`uint256`|The amount of tokens to deposit|
|`deadline`|`uint256`|The deadline for the permit signature|
|`v`|`uint8`|The v component of the permit signature|
|`r`|`bytes32`|The r component of the permit signature|
|`s`|`bytes32`|The s component of the permit signature|


### updateRewardShares

Updates reward shares for participants in a use case

*Only callable by use case owner when rewards are not locked*


```solidity
function updateRewardShares(string calldata useCaseId, address[] calldata _participants, uint96[] calldata shares)
    external
    nonReentrant
    useCaseExists(useCaseId)
    onlyUseCaseOwner(useCaseId);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`useCaseId`|`string`|The ID of the use case|
|`_participants`|`address[]`|Array of participant addresses|
|`shares`|`uint96[]`|Array of reward shares in basis points|


### addFixedRewards

Adds fixed rewards for participants


```solidity
function addFixedRewards(string calldata useCaseId, address[] calldata _participants, uint96[] calldata amounts)
    external
    nonReentrant
    useCaseExists(useCaseId)
    onlyUseCaseOwner(useCaseId);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`useCaseId`|`string`|The ID of the use case|
|`_participants`|`address[]`|Array of participant addresses|
|`amounts`|`uint96[]`|Array of fixed reward amounts|


### lockRewards

Locks rewards for a specified period


```solidity
function lockRewards(string calldata useCaseId, uint32 lockupPeriod)
    external
    useCaseExists(useCaseId)
    onlyUseCaseOwner(useCaseId);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`useCaseId`|`string`|The ID of the use case|
|`lockupPeriod`|`uint32`|The duration to lock rewards for|


### claimRewards

Allows participants to claim their rewards after lockup period

*Implements reentrancy protection*


```solidity
function claimRewards(string calldata useCaseId) external nonReentrant useCaseExists(useCaseId);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`useCaseId`|`string`|The ID of the use case|


### emergencyWithdraw

Emergency withdrawal of rewards by use case owner

*Only available when rewards are not locked*


```solidity
function emergencyWithdraw(string calldata useCaseId)
    external
    nonReentrant
    useCaseExists(useCaseId)
    onlyUseCaseOwner(useCaseId);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`useCaseId`|`string`|The ID of the use case|


### getParticipantInfo

Retrieves information about a specific participant in a use case


```solidity
function getParticipantInfo(string calldata useCaseId, address participant)
    external
    view
    returns (Participant memory);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`useCaseId`|`string`|The ID of the use case|
|`participant`|`address`|The address of the participant|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`<none>`|`Participant`|Participant information including shares and fixed rewards|


### getUseCaseInfo

Retrieves complete information about a use case


```solidity
function getUseCaseInfo(string calldata useCaseId) external view returns (UseCaseInfo memory);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`useCaseId`|`string`|The ID of the use case|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`<none>`|`UseCaseInfo`|Complete use case information including participants|


### getMultipleUseCaseInfo

Retrieves information about multiple use cases


```solidity
function getMultipleUseCaseInfo(string[] calldata useCaseIds) external view returns (UseCaseInfo[] memory);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`useCaseIds`|`string[]`|Array of use case IDs|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`<none>`|`UseCaseInfo[]`|Array of use case information|


## Events
### UseCaseCreated
Emitted when a new use case is created


```solidity
event UseCaseCreated(string id, address owner);
```

**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`id`|`string`|The unique identifier of the use case|
|`owner`|`address`|The address of the use case creator|

### RewardsDeposited
Emitted when rewards are deposited to a use case


```solidity
event RewardsDeposited(string useCaseId, uint256 amount);
```

**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`useCaseId`|`string`|The identifier of the use case|
|`amount`|`uint256`|The amount of tokens deposited|

### RewardSharesUpdated
Emitted when a participant's reward shares are updated


```solidity
event RewardSharesUpdated(string useCaseId, address participant, uint256 shares);
```

**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`useCaseId`|`string`|The identifier of the use case|
|`participant`|`address`|The address of the participant|
|`shares`|`uint256`|The new share amount in basis points|

### FixedRewardAdded
Emitted when a fixed reward is added for a participant


```solidity
event FixedRewardAdded(string useCaseId, address participant, uint256 amount);
```

**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`useCaseId`|`string`|The identifier of the use case|
|`participant`|`address`|The address of the participant|
|`amount`|`uint256`|The fixed reward amount|

### RewardsClaimed
Emitted when rewards are claimed by a participant


```solidity
event RewardsClaimed(string useCaseId, address participant, uint256 amount);
```

**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`useCaseId`|`string`|The identifier of the use case|
|`participant`|`address`|The address of the participant|
|`amount`|`uint256`|The amount of tokens claimed|

### RewardsLocked
Emitted when rewards are locked for a period


```solidity
event RewardsLocked(string useCaseId, uint256 lockupPeriod);
```

**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`useCaseId`|`string`|The identifier of the use case|
|`lockupPeriod`|`uint256`|The duration of the lockup in seconds|

### UseCaseOwnershipTransferred
Emitted when use case ownership is transferred


```solidity
event UseCaseOwnershipTransferred(string indexed useCaseId, address indexed previousOwner, address indexed newOwner);
```

### EmergencyWithdrawal
Emitted when an emergency withdrawal occurs


```solidity
event EmergencyWithdrawal(string indexed useCaseId, address indexed owner, uint256 amount);
```

## Errors
### UseCaseAlreadyExists

```solidity
error UseCaseAlreadyExists(string id);
```

### UseCaseDoesNotExist

```solidity
error UseCaseDoesNotExist(string id);
```

### ArrayLengthMismatch

```solidity
error ArrayLengthMismatch();
```

### ZeroAddress

```solidity
error ZeroAddress();
```

### ZeroAmount

```solidity
error ZeroAmount();
```

### TotalSharesExceeded

```solidity
error TotalSharesExceeded();
```

### RewardsAlreadyLocked

```solidity
error RewardsAlreadyLocked();
```

### RewardsNotLocked

```solidity
error RewardsNotLocked();
```

### InsufficientBalance

```solidity
error InsufficientBalance();
```

### InvalidLockupPeriod

```solidity
error InvalidLockupPeriod();
```

### NoRewardsToClaim

```solidity
error NoRewardsToClaim();
```

### MaxParticipantsExceeded

```solidity
error MaxParticipantsExceeded();
```

### RewardPoolOverflow

```solidity
error RewardPoolOverflow();
```

### NotUseCaseOwner

```solidity
error NotUseCaseOwner();
```

### LockupPeriodNotEnded

```solidity
error LockupPeriodNotEnded();
```

### TransferFailed

```solidity
error TransferFailed();
```

### ParticipantNotFound

```solidity
error ParticipantNotFound();
```

### EmergencyWithdrawalFailed

```solidity
error EmergencyWithdrawalFailed();
```

## Structs
### UseCaseInfo
Extended structure containing all use case information including participants


```solidity
struct UseCaseInfo {
    string id;
    address owner;
    uint96 rewardPool;
    uint32 lockupPeriod;
    uint32 lockTime;
    bool rewardsLocked;
    uint256 totalShares;
    Participant[] participants;
}
```

**Properties**

|Name|Type|Description|
|----|----|-----------|
|`id`|`string`|Unique identifier for the use case|
|`owner`|`address`|Address of the use case creator/owner|
|`rewardPool`|`uint96`|Total amount of tokens allocated for rewards|
|`lockupPeriod`|`uint32`|Duration for which rewards are locked|
|`lockTime`|`uint32`|Timestamp when rewards were locked|
|`rewardsLocked`|`bool`|Boolean indicating if rewards are currently locked|
|`totalShares`|`uint256`|Sum of all participant shares|
|`participants`|`Participant[]`|Array of all participants and their reward shares|

### Participant
Structure defining a participant's reward allocation


```solidity
struct Participant {
    address participant;
    uint96 rewardShare;
    uint96 fixedReward;
}
```

**Properties**

|Name|Type|Description|
|----|----|-----------|
|`participant`|`address`|Address of the participant|
|`rewardShare`|`uint96`|Percentage share of rewards in basis points (100 = 1%)|
|`fixedReward`|`uint96`|Additional fixed amount to be paid on claim|

### UseCase
Structure defining a use case's core properties


```solidity
struct UseCase {
    string id;
    address owner;
    uint96 rewardPool;
    uint32 lockupPeriod;
    uint32 lockTime;
    bool rewardsLocked;
}
```

**Properties**

|Name|Type|Description|
|----|----|-----------|
|`id`|`string`|Unique identifier for the use case|
|`owner`|`address`|Address of the use case creator/owner|
|`rewardPool`|`uint96`|Total amount of tokens allocated for rewards|
|`lockupPeriod`|`uint32`|Duration for which rewards are locked|
|`lockTime`|`uint32`|Timestamp when rewards were locked|
|`rewardsLocked`|`bool`|Boolean indicating if rewards are currently locked|

