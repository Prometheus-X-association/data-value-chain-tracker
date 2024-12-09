# UseCaseContract
[Git Source](https://github.com/Prometheus-X-association/data-value-chain-tracker/blob/f5fc51f4370c215daf8b8d976e067a09a22686a3/src/UseCaseContract.sol)

**Inherits:**
Ownable, ReentrancyGuard

Manages reward distribution for specific use cases with configurable events and lock periods

*Handles event notification, reward calculation, and distribution with safety features*


## State Variables
### factory
Reference to the factory contract that created this use case


```solidity
UseCaseFactory public immutable factory;
```


### rewardToken
Token used for rewards


```solidity
IPTXToken public immutable rewardToken;
```


### lockDuration
Duration rewards are locked before they can be claimed


```solidity
uint256 public immutable lockDuration;
```


### remainingRewardPool
Remaining tokens in the reward pool


```solidity
uint256 public remainingRewardPool;
```


### eventConfigs
Mapping of event hash to its configuration


```solidity
mapping(bytes32 => EventConfig) public eventConfigs;
```


### supportedEvents
List of supported event hashes


```solidity
bytes32[] public supportedEvents;
```


### participantRewards
Mapping of participant address to their rewards


```solidity
mapping(address => Reward[]) public participantRewards;
```


### MAX_FACTOR
Maximum reward factor (100%)


```solidity
uint256 public constant MAX_FACTOR = 1e18;
```


### MIN_FACTOR
Minimum reward factor (1%)


```solidity
uint256 public constant MIN_FACTOR = 1e16;
```


### MIN_LOCK_DURATION
Minimum lock duration for rewards (if non-zero)


```solidity
uint256 public constant MIN_LOCK_DURATION = 1 hours;
```


### MAX_LOCK_DURATION
Maximum lock duration for rewards


```solidity
uint256 public constant MAX_LOCK_DURATION = 30 days;
```


### ADMIN_ACTION_COOLDOWN
Cooldown period between admin actions


```solidity
uint256 public constant ADMIN_ACTION_COOLDOWN = 1 days;
```


### MAX_REWARD_HISTORY
Maximum number of rewards per participant


```solidity
uint256 public constant MAX_REWARD_HISTORY = 1000;
```


### lastAdminAction
Timestamp of last admin action


```solidity
uint256 public lastAdminAction;
```


### paused
Whether the contract is paused


```solidity
bool public paused;
```


### VERSION
Version of the contract for tracking deployments


```solidity
string public constant VERSION = "1.0.0";
```


## Functions
### onlyNotifier

Ensures caller is authorized to notify events


```solidity
modifier onlyNotifier();
```

### whenNotPaused

Ensures contract is not paused


```solidity
modifier whenNotPaused();
```

### withCooldown

Ensures cooldown period has passed


```solidity
modifier withCooldown();
```

### sufficientBalance

Ensures contract has sufficient token balance


```solidity
modifier sufficientBalance(uint256 amount);
```

### constructor

Initializes the use case with event configurations


```solidity
constructor(
    address owner_,
    uint256 rewardPool_,
    uint256 lockDuration_,
    address rewardToken_,
    string[] memory eventNames,
    uint256[] memory baseRewards
) Ownable(owner_);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`owner_`|`address`|Address that will own this use case|
|`rewardPool_`|`uint256`|Initial size of reward pool|
|`lockDuration_`|`uint256`|Duration rewards are locked before claiming|
|`rewardToken_`|`address`|Address of token used for rewards|
|`eventNames`|`string[]`|List of event names to configure|
|`baseRewards`|`uint256[]`|List of base rewards for each event|


### notifyEvent

Notifies the contract of an event occurrence


```solidity
function notifyEvent(string calldata eventName, address participant, uint256 factor)
    external
    onlyNotifier
    whenNotPaused;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`eventName`|`string`|Name of the event that occurred|
|`participant`|`address`|Address to receive the reward|
|`factor`|`uint256`|Reward adjustment factor (between MIN_FACTOR and MAX_FACTOR)|


### rejectReward

Allows owner to reject a pending reward


```solidity
function rejectReward(address participant, uint256 rewardIndex) external onlyOwner;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`participant`|`address`|Address whose reward is being rejected|
|`rewardIndex`|`uint256`|Index of the reward in participant's reward array|


### batchRejectRewards

Allows owner to reject multiple rewards in one transaction


```solidity
function batchRejectRewards(address[] calldata participants, uint256[] calldata rewardIndices) external onlyOwner;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`participants`|`address[]`|Array of addresses whose rewards are being rejected|
|`rewardIndices`|`uint256[]`|Array of reward indices corresponding to each participant|


### claimRewards

Allows participants to claim their unlocked rewards


```solidity
function claimRewards() external nonReentrant;
```

### getSupportedEvents

Gets all supported events and their base rewards


```solidity
function getSupportedEvents() external view returns (string[] memory names, uint256[] memory rewards);
```
**Returns**

|Name|Type|Description|
|----|----|-----------|
|`names`|`string[]`|Array of event names|
|`rewards`|`uint256[]`|Array of base rewards|


### pause

Pauses the contract


```solidity
function pause() external onlyOwner;
```

### unpause

Unpauses the contract


```solidity
function unpause() external onlyOwner;
```

### emergencyWithdraw

Emergency withdrawal of all tokens


```solidity
function emergencyWithdraw() external onlyOwner nonReentrant;
```

### topUpRewardPool

Adds tokens to the reward pool


```solidity
function topUpRewardPool(uint256 amount) external onlyOwner;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`amount`|`uint256`|Amount of tokens to add|


### withdrawUnusedRewards

Withdraws unused rewards


```solidity
function withdrawUnusedRewards() external onlyOwner withCooldown sufficientBalance(remainingRewardPool);
```

### getUseCaseId

Gets the use case ID from the factory


```solidity
function getUseCaseId() internal view returns (uint256);
```
**Returns**

|Name|Type|Description|
|----|----|-----------|
|`<none>`|`uint256`|The ID of this use case|


### getUseCaseStats

Gets total stats for the use case


```solidity
function getUseCaseStats()
    external
    view
    returns (
        uint256 totalAllocated,
        uint256 totalClaimed,
        uint256 totalRejected,
        uint256 totalPending,
        uint256 rewardPool_,
        uint256 remainingRewardPool_,
        bool isActive
    );
```
**Returns**

|Name|Type|Description|
|----|----|-----------|
|`totalAllocated`|`uint256`|Total rewards allocated|
|`totalClaimed`|`uint256`|Total rewards claimed|
|`totalRejected`|`uint256`|Total rewards rejected|
|`totalPending`|`uint256`|Total rewards pending|
|`rewardPool_`|`uint256`|Initial reward pool amount|
|`remainingRewardPool_`|`uint256`|Current remaining reward pool|
|`isActive`|`bool`|Whether the contract is active|


### getMultipleParticipantRewards

Gets rewards for multiple participants


```solidity
function getMultipleParticipantRewards(address[] calldata participants)
    external
    view
    returns (Reward[] memory rewards);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`participants`|`address[]`|Array of participant addresses|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`rewards`|`Reward[]`|Array of Reward arrays for each participant|


### getParticipantRewards

Gets all rewards for a specific participant


```solidity
function getParticipantRewards(address participant) external view returns (Reward[] memory);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`participant`|`address`|Address of the participant|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`<none>`|`Reward[]`|Array of Reward structs for the participant|


## Events
### EventConfigured
Emitted when an event type is configured


```solidity
event EventConfigured(bytes32 indexed eventTypeHash, string eventName, uint256 baseReward);
```

### RewardAllocated
Emitted when a reward is allocated


```solidity
event RewardAllocated(
    address indexed participant, bytes32 indexed eventTypeHash, string eventName, uint256 amount, uint256 unlockTime
);
```

### RewardRejected
Emitted when a reward is rejected


```solidity
event RewardRejected(address indexed participant, uint256 rewardIndex, uint256 amount);
```

### RewardClaimed
Emitted when rewards are claimed


```solidity
event RewardClaimed(address indexed participant, uint256 totalAmount);
```

### RewardPoolUpdated
Emitted when reward pool balance changes


```solidity
event RewardPoolUpdated(uint256 newBalance);
```

### ParticipantStats
Emitted with participant statistics


```solidity
event ParticipantStats(address indexed participant, uint256 totalRewarded, uint256 totalClaimed, uint256 totalRejected);
```

## Structs
### EventConfig
Configuration for each event type


```solidity
struct EventConfig {
    bool isEnabled;
    uint256 baseReward;
    string eventName;
}
```

**Properties**

|Name|Type|Description|
|----|----|-----------|
|`isEnabled`|`bool`|Whether this event type is valid for this use case|
|`baseReward`|`uint256`|Base reward amount for this event type|
|`eventName`|`string`|Name/description of the event|

### Reward
Reward information for participants


```solidity
struct Reward {
    address participant;
    uint256 amount;
    uint256 unlockTime;
    bool rejected;
    bool claimed;
    bytes32 eventType;
    string eventName;
}
```

**Properties**

|Name|Type|Description|
|----|----|-----------|
|`participant`|`address`|Address of the participant|
|`amount`|`uint256`|Amount of tokens to be rewarded|
|`unlockTime`|`uint256`|Timestamp when the reward becomes claimable|
|`rejected`|`bool`|Whether the reward was rejected by orchestrator|
|`claimed`|`bool`|Whether the reward was claimed by participant|
|`eventType`|`bytes32`|Hash of the event type that triggered this reward|
|`eventName`|`string`|Name of the event for transparency|

