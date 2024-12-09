// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title PTX Token
/// @notice Token used for rewarding participants in use cases
contract PTXToken is ERC20, Ownable {
    /// @notice Emitted when tokens are used as rewards
    event RewardTransfer(
        address indexed from,
        address indexed to,
        uint256 amount,
        bytes32 indexed useCaseId
    );

    constructor(
        uint256 initialSupply
    ) ERC20("PTXToken", "PTX") Ownable(msg.sender) {
        _mint(msg.sender, initialSupply * (10 ** decimals()));
    }

    /// @notice Transfers tokens and emits a reward-specific event
    /// @param to Recipient of the reward
    /// @param amount Amount of tokens to transfer
    /// @param useCaseId Identifier of the use case
    /// @return success Whether the transfer was successful
    function transferReward(
        address to,
        uint256 amount,
        bytes32 useCaseId
    ) external returns (bool) {
        bool success = transfer(to, amount);
        if (success) {
            emit RewardTransfer(msg.sender, to, amount, useCaseId);
        }
        return success;
    }

    /// @notice Version of the contract
    function version() external pure returns (string memory) {
        return "1.0.0";
    }
}
