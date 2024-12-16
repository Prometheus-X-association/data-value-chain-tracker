# PTXToken
[Git Source](https://github.com/Prometheus-X-association/data-value-chain-tracker/blob/46cac2de8f2e7590f1792258a001516bd7e53e86/src/PTXToken.sol)

**Inherits:**
ERC20, ERC20Permit, AccessControl

ERC20 token for managing and distributing rewards in the PTX ecosystem

*Extends ERC20Permit for gasless transactions*


## Functions
### constructor

Initializes the PTX token

*Sets up initial roles and mints initial supply to deployer*


```solidity
constructor(uint256 initialSupply) ERC20("PTXToken", "PTX") ERC20Permit("PTXToken");
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`initialSupply`|`uint256`|The initial amount of tokens to mint|


### transferReward

Transfers tokens as rewards from one address to another


```solidity
function transferReward(address from, address to, uint256 amount, bytes32 incentiveType) external;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`from`|`address`|The address to transfer from|
|`to`|`address`|The address to transfer to|
|`amount`|`uint256`|The amount of tokens to transfer|
|`incentiveType`|`bytes32`|The type of incentive being rewarded|


### transferRewardWithPermit

Transfers tokens as rewards using EIP-2612 permit


```solidity
function transferRewardWithPermit(
    address owner,
    address spender,
    address to,
    uint256 amount,
    uint256 deadline,
    uint8 v,
    bytes32 r,
    bytes32 s,
    bytes32 incentiveType
) external;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`owner`|`address`|The owner of the tokens|
|`spender`|`address`||
|`to`|`address`|The address to transfer to|
|`amount`|`uint256`|The amount of tokens to transfer|
|`deadline`|`uint256`|The timestamp until which the signature is valid|
|`v`|`uint8`|The recovery byte of the signature|
|`r`|`bytes32`|Half of the ECDSA signature pair|
|`s`|`bytes32`|Half of the ECDSA signature pair|
|`incentiveType`|`bytes32`|The type of incentive being rewarded|


### version

Returns the version of the token contract


```solidity
function version() external pure returns (string memory);
```
**Returns**

|Name|Type|Description|
|----|----|-----------|
|`<none>`|`string`|The semantic version string|


### PERMIT_TYPEHASH

Returns the permit typehash


```solidity
function PERMIT_TYPEHASH() public pure returns (bytes32);
```

## Events
### RewardTransfer
Emitted when tokens are transferred as rewards


```solidity
event RewardTransfer(address indexed from, address indexed to, uint256 amount, bytes32 indexed incentiveType);
```

**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`from`|`address`|The address tokens are transferred from|
|`to`|`address`|The address tokens are transferred to|
|`amount`|`uint256`|The amount of tokens transferred|
|`incentiveType`|`bytes32`|The type of incentive being rewarded|

## Errors
### ZeroAddress
Thrown when a zero address is provided where a valid address is required


```solidity
error ZeroAddress();
```

### ZeroAmount
Thrown when attempting to transfer zero tokens


```solidity
error ZeroAmount();
```

