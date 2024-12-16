// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/// @title PTX Token
/// @notice ERC20 token for managing and distributing rewards in the PTX ecosystem
/// @dev Extends ERC20Permit for gasless transactions
contract PTXToken is ERC20, ERC20Permit, AccessControl {
    /// @notice Thrown when a zero address is provided where a valid address is required
    error ZeroAddress();
    /// @notice Thrown when attempting to transfer zero tokens
    error ZeroAmount();

    /// @notice Emitted when tokens are transferred as rewards
    /// @param from The address tokens are transferred from
    /// @param to The address tokens are transferred to
    /// @param amount The amount of tokens transferred
    /// @param incentiveType The type of incentive being rewarded
    event RewardTransfer(
        address indexed from,
        address indexed to,
        uint256 amount,
        bytes32 indexed incentiveType
    );

    /// @notice Initializes the PTX token
    /// @dev Sets up initial roles and mints initial supply to deployer
    /// @param initialSupply The initial amount of tokens to mint
    constructor(uint256 initialSupply)
        ERC20("PTXToken", "PTX") 
        ERC20Permit("PTXToken") 
    {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _mint(msg.sender, initialSupply);
    }

    /// @notice Transfers tokens as rewards from one address to another
    /// @param from The address to transfer from
    /// @param to The address to transfer to
    /// @param amount The amount of tokens to transfer
    /// @param incentiveType The type of incentive being rewarded
    function transferReward(
        address from,
        address to,
        uint256 amount,
        bytes32 incentiveType
    ) external {
        if(from == address(0) || to == address(0)) revert ZeroAddress();
        if(amount == 0) revert ZeroAmount();

        transferFrom(from, to, amount);
        emit RewardTransfer(from, to, amount, incentiveType);
    }

    /// @notice Transfers tokens as rewards using EIP-2612 permit
    /// @param owner The owner of the tokens
    /// @param to The address to transfer to
    /// @param amount The amount of tokens to transfer
    /// @param deadline The timestamp until which the signature is valid
    /// @param v The recovery byte of the signature
    /// @param r Half of the ECDSA signature pair
    /// @param s Half of the ECDSA signature pair
    /// @param incentiveType The type of incentive being rewarded
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
    ) external {
        if(owner == address(0) || to == address(0)) revert ZeroAddress();
        if(amount == 0) revert ZeroAmount();

        permit(owner, spender, amount, deadline, v, r, s);
        transferFrom(owner, to, amount);
        emit RewardTransfer(owner, to, amount, incentiveType);
    }

    /// @notice Returns the version of the token contract
    /// @return The semantic version string
    function version() external pure returns (string memory) {
        return "1.0.0";
    }

    /// @notice Returns the permit typehash
    function PERMIT_TYPEHASH() public pure returns (bytes32) {
        return keccak256("Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)");
    }
}
