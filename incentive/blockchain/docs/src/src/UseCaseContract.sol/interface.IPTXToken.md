# IPTXToken
[Git Source](https://github.com/Prometheus-X-association/data-value-chain-tracker/blob/46cac2de8f2e7590f1792258a001516bd7e53e86/src/UseCaseContract.sol)

Manages reward distribution use cases with configurable participant shares and lockup periods

*Implements access control and reentrancy protection for secure reward management*


## Functions
### transfer


```solidity
function transfer(address to, uint256 value) external returns (bool);
```

### transferFrom


```solidity
function transferFrom(address from, address to, uint256 value) external returns (bool);
```

### transferReward


```solidity
function transferReward(address from, address to, uint256 amount, bytes32 incentiveType) external;
```

### transferRewardWithPermit


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

### balanceOf


```solidity
function balanceOf(address account) external view returns (uint256);
```

### approve


```solidity
function approve(address spender, uint256 value) external returns (bool);
```

### permit


```solidity
function permit(address owner, address spender, uint256 value, uint256 deadline, uint8 v, bytes32 r, bytes32 s)
    external;
```

### version


```solidity
function version() external pure returns (string memory);
```

