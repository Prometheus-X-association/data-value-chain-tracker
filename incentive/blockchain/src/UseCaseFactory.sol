// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./UseCaseContract.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @title Use Case Factory for Managing Reward Distribution Contracts
/// @notice Factory contract that creates and manages use case instances for reward distribution
/// @dev Handles access control for operators and notifiers, and manages use case creation
contract UseCaseFactory is Ownable {
    /// @notice The token used for rewards across all use cases
    address public immutable incentiveToken;
    
    /// @notice Mapping of use case ID to its contract address
    mapping(uint256 => address) public useCaseContracts;
    
    /// @notice Counter for generating unique use case IDs
    uint256 public nextUseCaseId;

    // Access Control
    /// @notice Operators can manage notifiers
    mapping(address => bool) public operators;
    /// @notice Global notifiers can notify events for all use cases
    mapping(address => bool) public globalNotifiers;
    /// @notice Use case specific notifiers
    mapping(uint256 => mapping(address => bool)) public useCaseNotifiers;

    /// @notice Minimum reward pool size for new use cases
    uint256 public constant MIN_REWARD_POOL = 100;
    /// @notice Current version of the factory contract
    string public constant VERSION = "1.0.0";

    // Events
    /// @notice Emitted when a new use case is created
    /// @param useCaseId The unique identifier for the use case
    /// @param contractAddress The address of the newly created use case contract
    /// @param eventNames List of event names configured for the use case
    /// @param baseRewards List of base rewards corresponding to each event
    event UseCaseCreated(
        uint256 indexed useCaseId, 
        address contractAddress,
        string[] eventNames,
        uint256[] baseRewards
    );

    /// @notice Emitted when an operator is added
    event OperatorAdded(address indexed operator);
    /// @notice Emitted when an operator is removed
    event OperatorRemoved(address indexed operator);
    /// @notice Emitted when a global notifier is added
    event GlobalNotifierAdded(address indexed notifier, address indexed addedBy);
    /// @notice Emitted when a global notifier is removed
    event GlobalNotifierRemoved(address indexed notifier, address indexed removedBy);
    /// @notice Emitted when a use case specific notifier is added
    event UseCaseNotifierAdded(
        uint256 indexed useCaseId, 
        address indexed notifier, 
        address indexed addedBy
    );
    /// @notice Emitted when a use case specific notifier is removed
    event UseCaseNotifierRemoved(
        uint256 indexed useCaseId, 
        address indexed notifier, 
        address indexed removedBy
    );

    /// @notice Ensures caller is an operator or owner
    modifier onlyOperator() {
        require(operators[msg.sender] || owner() == msg.sender, "Not authorized operator");
        _;
    }

    /// @notice Initializes the factory with the reward token address
    /// @param _incentiveToken Address of the ERC20 token used for rewards
    constructor(address _incentiveToken) Ownable(msg.sender) {
        require(_incentiveToken != address(0), "Token address cannot be zero");
        incentiveToken = _incentiveToken;
        operators[msg.sender] = true;
        emit OperatorAdded(msg.sender);
    }

    /// @notice Adds a new operator
    /// @param operator Address to be added as operator
    function addOperator(address operator) external onlyOwner {
        require(operator != address(0), "Invalid address");
        require(!operators[operator], "Already an operator");
        operators[operator] = true;
        emit OperatorAdded(operator);
    }

    /// @notice Removes an operator
    /// @param operator Address to be removed from operators
    function removeOperator(address operator) external onlyOwner {
        require(operators[operator], "Not an operator");
        require(operator != owner(), "Cannot remove owner as operator");
        delete operators[operator];
        emit OperatorRemoved(operator);
    }

    /// @notice Adds a global notifier
    /// @param notifier Address to be added as global notifier
    function addGlobalNotifier(address notifier) external onlyOperator {
        require(notifier != address(0), "Invalid address");
        require(!globalNotifiers[notifier], "Already global notifier");
        globalNotifiers[notifier] = true;
        emit GlobalNotifierAdded(notifier, msg.sender);
    }

    /// @notice Creates a new use case contract
    /// @param lockDuration Duration rewards are locked before claiming
    /// @param eventNames List of event names for the use case
    /// @param baseRewards List of base rewards for each event
    /// @return The ID of the newly created use case
    function createUseCase(
        uint256 lockDuration,
        string[] calldata eventNames,
        uint256[] calldata baseRewards,
        uint256 rewardPoolAmount
    ) external returns (uint256) {
        require(eventNames.length > 0, "No events specified");
        require(eventNames.length == baseRewards.length, "Arrays length mismatch");
        
        uint256 useCaseId = nextUseCaseId++;
        
        // Create the use case contract first
        UseCaseContract useCase = new UseCaseContract(
            msg.sender,
            rewardPoolAmount,
            lockDuration,
            address(incentiveToken),
            eventNames,
            baseRewards
        );
        
        // Transfer tokens from user to the new use case contract
        require(
            IERC20(incentiveToken).transferFrom(
                msg.sender, 
                address(useCase), 
                rewardPoolAmount
            ),
            "Token transfer failed"
        );
        
        useCaseContracts[useCaseId] = address(useCase);

        emit UseCaseCreated(
            useCaseId, 
            address(useCase),
            eventNames,
            baseRewards
        );

        return useCaseId;
    }

    /// @notice Checks if an address can notify events for a use case
    /// @param useCaseId The ID of the use case
    /// @param notifier The address to check
    /// @return bool True if the address can notify events
    function canNotifyEvents(uint256 useCaseId, address notifier) public view returns (bool) {
        return globalNotifiers[notifier] || useCaseNotifiers[useCaseId][notifier];
    }

    /// @notice Gets all use cases owned by a specific address
    /// @param owner The address to check
    /// @return useCaseIds Array of use case IDs owned by the address
    function getUseCasesByOwner(
        address owner
    ) external view returns (uint256[] memory useCaseIds) {
        uint256 count = 0;
        for (uint256 i = 0; i < nextUseCaseId; i++) {
            if (UseCaseContract(useCaseContracts[i]).owner() == owner) {
                count++;
            }
        }
        
        useCaseIds = new uint256[](count);
        uint256 index = 0;
        for (uint256 i = 0; i < nextUseCaseId; i++) {
            if (UseCaseContract(useCaseContracts[i]).owner() == owner) {
                useCaseIds[index++] = i;
            }
        }
    }
}