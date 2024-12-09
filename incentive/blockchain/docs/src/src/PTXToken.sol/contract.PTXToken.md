# PTXToken
[Git Source](https://github.com/Prometheus-X-association/data-value-chain-tracker/blob/f5fc51f4370c215daf8b8d976e067a09a22686a3/src/PTXToken.sol)

**Inherits:**
ERC20, Ownable

Token used for rewarding participants in use cases


## Functions
### constructor


```solidity
constructor(uint256 initialSupply) ERC20("PTXToken", "PTX") Ownable(msg.sender);
```

### transferReward

Transfers tokens and emits a reward-specific event


```solidity
function transferReward(address to, uint256 amount, bytes32 useCaseId) external returns (bool);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`to`|`address`|Recipient of the reward|
|`amount`|`uint256`|Amount of tokens to transfer|
|`useCaseId`|`bytes32`|Identifier of the use case|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`<none>`|`bool`|success Whether the transfer was successful|


### version

Version of the contract


```solidity
function version() external pure returns (string memory);
```

## Events
### RewardTransfer
Emitted when tokens are used as rewards


```solidity
event RewardTransfer(address indexed from, address indexed to, uint256 amount, bytes32 indexed useCaseId);
```

