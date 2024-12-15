// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";

/// @title PTX Token
/// @notice Token used for rewarding participants in use cases
contract PTXToken is ERC20, ERC20Permit {
    /// @notice Emitted when tokens are used as rewards
    event RewardTransfer(
        address indexed from,
        address indexed to,
        uint256 amount,
        bytes32 indexed incentiveType
    );

    bytes32 public constant PERMIT_TYPEHASH = keccak256("Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)");

    constructor(uint256 initialSupply)
        ERC20("PTXToken", "PTX") 
        ERC20Permit("PTXToken") 
    {
        _mint(msg.sender, initialSupply);
    }

    function transferReward(
        address from,
        address to,
        uint256 amount,
        bytes32 incentiveType
    ) external {
        transferFrom(from, to, amount);
        emit RewardTransfer(from, to, amount, incentiveType);
    }

    function transferRewardWithPermit(
        address owner,
        address to,
        uint256 amount,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s,
        bytes32 incentiveType
    ) external {
        permit(owner, to, amount, deadline, v, r, s);
        
        _transfer(owner, to, amount);
        emit RewardTransfer(owner, to, amount, incentiveType);
    }

    /// @notice Version of the contract
    function version() external pure returns (string memory) {
        return "1.0.0";
    }
}
