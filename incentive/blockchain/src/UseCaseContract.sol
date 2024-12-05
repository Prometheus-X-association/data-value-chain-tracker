// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./UseCaseFactory.sol";

interface IPTXToken {
    function transfer(address to, uint256 value) external returns (bool);
    function transferFrom(address from, address to, uint256 value) external returns (bool);
    function transferReward(address to, uint256 value, bytes32 useCaseId) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function approve(address spender, uint256 value) external returns (bool);
}

/// @title Use Case Contract for Reward Distribution
/// @notice Manages reward distribution for specific use cases with configurable events and lock periods
/// @dev Handles event notification, reward calculation, and distribution with safety features
contract UseCaseContract is Ownable, ReentrancyGuard {
    /// @notice Configuration for each event type
    /// @param isEnabled Whether this event type is valid for this use case
    /// @param baseReward Base reward amount for this event type
    /// @param eventName Name/description of the event
    struct EventConfig {
        bool isEnabled;
        uint256 baseReward;
        string eventName;
    }

    /// @notice Reward information for participants
    /// @param amount Amount of tokens to be rewarded
    /// @param unlockTime Timestamp when the reward becomes claimable
    /// @param rejected Whether the reward was rejected by orchestrator
    /// @param claimed Whether the reward was claimed by participant
    /// @param eventType Hash of the event type that triggered this reward
    /// @param eventName Name of the event for transparency
    struct Reward {
        uint256 amount;
        uint256 unlockTime;
        bool rejected;
        bool claimed;
        bytes32 eventType;
        string eventName;
    }

    // Core state variables
    /// @notice Reference to the factory contract that created this use case
    UseCaseFactory public immutable factory;
    /// @notice Token used for rewards
    IPTXToken public immutable rewardToken;
    /// @notice Duration rewards are locked before they can be claimed
    uint256 public immutable lockDuration;
    /// @notice Remaining tokens in the reward pool
    uint256 public remainingRewardPool;

    // Event configuration and rewards
    /// @notice Mapping of event hash to its configuration
    mapping(bytes32 => EventConfig) public eventConfigs;
    /// @notice List of supported event hashes
    bytes32[] public supportedEvents;
    /// @notice Mapping of participant address to their rewards
    mapping(address => Reward[]) public participantRewards;

    // Constants
    /// @notice Maximum reward factor (100%)
    uint256 public constant MAX_FACTOR = 1e18;    // 1.0 = 100%
    /// @notice Minimum reward factor (1%)
    uint256 public constant MIN_FACTOR = 1e16;    // 0.01 = 1%
    /// @notice Minimum lock duration for rewards
    uint256 public constant MIN_LOCK_DURATION = 1 hours;
    /// @notice Maximum lock duration for rewards
    uint256 public constant MAX_LOCK_DURATION = 30 days;
    /// @notice Cooldown period between admin actions
    uint256 public constant ADMIN_ACTION_COOLDOWN = 1 days;
    /// @notice Maximum number of rewards per participant
    uint256 public constant MAX_REWARD_HISTORY = 1000;

    // State variables
    /// @notice Timestamp of last admin action
    uint256 public lastAdminAction;
    /// @notice Whether the contract is paused
    bool public paused;

    // Events
    /// @notice Emitted when an event type is configured
    event EventConfigured(
        bytes32 indexed eventTypeHash,
        string eventName,
        uint256 baseReward
    );

    /// @notice Emitted when a reward is allocated
    event RewardAllocated(
        address indexed participant,
        bytes32 indexed eventTypeHash,
        string eventName,
        uint256 amount,
        uint256 unlockTime
    );

    /// @notice Emitted when a reward is rejected
    event RewardRejected(
        address indexed participant,
        uint256 rewardIndex,
        uint256 amount
    );

    /// @notice Emitted when rewards are claimed
    event RewardClaimed(
        address indexed participant,
        uint256 totalAmount
    );

    /// @notice Emitted when reward pool balance changes
    event RewardPoolUpdated(uint256 newBalance);

    /// @notice Emitted with participant statistics
    event ParticipantStats(
        address indexed participant,
        uint256 totalRewarded,
        uint256 totalClaimed,
        uint256 totalRejected
    );

    // Modifiers
    /// @notice Ensures caller is authorized to notify events
    modifier onlyNotifier() {
        require(
            factory.canNotifyEvents(getUseCaseId(), msg.sender),
            "Not authorized notifier"
        );
        _;
    }

    /// @notice Ensures contract is not paused
    modifier whenNotPaused() {
        require(!paused, "Contract is paused");
        _;
    }

    /// @notice Ensures cooldown period has passed
    modifier withCooldown() {
        require(
            block.timestamp >= lastAdminAction + ADMIN_ACTION_COOLDOWN,
            "Action in cooldown"
        );
        lastAdminAction = block.timestamp;
        _;
    }

    /// @notice Ensures contract has sufficient token balance
    modifier sufficientBalance(uint256 amount) {
        require(
            rewardToken.balanceOf(address(this)) >= amount,
            "Insufficient token balance"
        );
        _;
    }

    /// @notice Initializes the use case with event configurations
    /// @param owner_ Address that will own this use case
    /// @param rewardPool_ Initial size of reward pool
    /// @param lockDuration_ Duration rewards are locked before claiming
    /// @param rewardToken_ Address of token used for rewards
    /// @param eventNames List of event names to configure
    /// @param baseRewards List of base rewards for each event
    constructor(
        address owner_,
        uint256 rewardPool_,
        uint256 lockDuration_,
        address rewardToken_,
        string[] memory eventNames,
        uint256[] memory baseRewards
    ) Ownable(owner_) {
        require(owner_ != address(0), "Invalid owner");
        require(eventNames.length <= 100, "Too many events");
        for (uint256 i = 0; i < eventNames.length; i++) {
            require(bytes(eventNames[i]).length <= 32, "Event name too long");
            require(bytes(eventNames[i]).length > 0, "Empty event name");
            require(baseRewards[i] > 0, "Invalid base reward");
        }
        require(rewardPool_ > 0, "Invalid reward pool");
        require(lockDuration_ >= MIN_LOCK_DURATION, "Lock duration too short");
        require(lockDuration_ <= MAX_LOCK_DURATION, "Lock duration too long");
        require(rewardToken_ != address(0), "Invalid token address");
        require(
            eventNames.length == baseRewards.length,
            "Arrays length mismatch"
        );
        require(eventNames.length > 0, "No events configured");

        factory = UseCaseFactory(msg.sender);
        rewardToken = IPTXToken(rewardToken_);
        lockDuration = lockDuration_;
        remainingRewardPool = rewardPool_;

        // Configure enabled events
        for (uint256 i = 0; i < eventNames.length; i++) {
            require(bytes(eventNames[i]).length > 0, "Empty event name");
            require(baseRewards[i] > 0, "Invalid base reward");
            
            bytes32 eventHash = keccak256(abi.encodePacked(eventNames[i]));
            require(!eventConfigs[eventHash].isEnabled, "Duplicate event");

            eventConfigs[eventHash] = EventConfig({
                isEnabled: true,
                baseReward: baseRewards[i],
                eventName: eventNames[i]
            });
            supportedEvents.push(eventHash);
            
            emit EventConfigured(eventHash, eventNames[i], baseRewards[i]);
        }
    }

    /// @notice Notifies the contract of an event occurrence
    /// @param eventName Name of the event that occurred
    /// @param participant Address to receive the reward
    /// @param factor Reward adjustment factor (between MIN_FACTOR and MAX_FACTOR)
    function notifyEvent(
        string calldata eventName,
        address participant,
        uint256 factor
    ) external onlyNotifier whenNotPaused {
        require(factor <= MAX_FACTOR, "Factor too high");
        require(factor >= MIN_FACTOR, "Factor below minimum (1%)");
        bytes32 eventHash = keccak256(abi.encodePacked(eventName));
        EventConfig memory config = eventConfigs[eventHash];
        require(config.isEnabled, "Event type not enabled");
        require(participant != address(0), "Invalid participant");

        uint256 rewardAmount = (config.baseReward * factor) / 1e18;
        require(rewardAmount <= remainingRewardPool, "Insufficient reward pool");

        remainingRewardPool -= rewardAmount;
        uint256 unlockTime = block.timestamp + lockDuration;

        participantRewards[participant].push(Reward({
            amount: rewardAmount,
            unlockTime: unlockTime,
            rejected: false,
            claimed: false,
            eventType: eventHash,
            eventName: eventName
        }));

        emit RewardAllocated(
            participant,
            eventHash,
            eventName,
            rewardAmount,
            unlockTime
        );
    }

    /// @notice Allows owner to reject a pending reward
    /// @param participant Address whose reward is being rejected
    /// @param rewardIndex Index of the reward in participant's reward array
    function rejectReward(
        address participant,
        uint256 rewardIndex
    ) external onlyOwner {
        require(rewardIndex < participantRewards[participant].length, "Invalid index");
        Reward storage reward = participantRewards[participant][rewardIndex];
        
        require(!reward.claimed, "Already claimed");
        require(!reward.rejected, "Already rejected");
        require(block.timestamp < reward.unlockTime, "Lock period expired");

        uint256 amount = reward.amount;
        reward.rejected = true;
        remainingRewardPool += amount;

        emit RewardRejected(participant, rewardIndex, amount);
    }

    /// @notice Allows owner to reject multiple rewards in one transaction
    /// @param participants Array of addresses whose rewards are being rejected
    /// @param rewardIndices Array of reward indices corresponding to each participant
    function batchRejectRewards(
        address[] calldata participants,
        uint256[] calldata rewardIndices
    ) external onlyOwner {
        require(participants.length == rewardIndices.length, "Array length mismatch");
        for (uint256 i = 0; i < participants.length; i++) {
            this.rejectReward(participants[i], rewardIndices[i]);
        }
    }

    /// @notice Allows participants to claim their unlocked rewards
    function claimRewards() external nonReentrant {
        Reward[] storage rewards = participantRewards[msg.sender];
        uint256 totalClaimable = 0;

        for (uint256 i = 0; i < rewards.length; i++) {
            Reward storage reward = rewards[i];
            if (!reward.claimed && 
                !reward.rejected && 
                block.timestamp >= reward.unlockTime) {
                reward.claimed = true;
                totalClaimable += reward.amount;
            }
        }

        require(totalClaimable > 0, "No claimable rewards");
        
        // Use the new transferReward function
        require(
            rewardToken.transferReward(
                msg.sender,
                totalClaimable,
                bytes32(getUseCaseId())
            ),
            "Token transfer failed"
        );

        emit RewardClaimed(msg.sender, totalClaimable);
    }

    /// @notice Gets all supported events and their base rewards
    /// @return names Array of event names
    /// @return rewards Array of base rewards
    function getSupportedEvents() external view returns (
        string[] memory names,
        uint256[] memory rewards
    ) {
        uint256 length = supportedEvents.length;
        names = new string[](length);
        rewards = new uint256[](length);

        for (uint256 i = 0; i < length; i++) {
            EventConfig memory config = eventConfigs[supportedEvents[i]];
            names[i] = config.eventName;
            rewards[i] = config.baseReward;
        }
    }

    /// @notice Pauses the contract
    function pause() external onlyOwner {
        paused = true;
    }

    /// @notice Unpauses the contract
    function unpause() external onlyOwner {
        paused = false;
    }

    /// @notice Emergency withdrawal of all tokens
    function emergencyWithdraw() external onlyOwner nonReentrant {
        require(paused, "Contract must be paused");
        rewardToken.transferReward(
            owner(),
            rewardToken.balanceOf(address(this)),
            bytes32(getUseCaseId())
        );
    }

    /// @notice Adds tokens to the reward pool
    /// @param amount Amount of tokens to add
    function topUpRewardPool(uint256 amount) external onlyOwner {
        require(amount > 0, "Invalid amount");
        require(
            rewardToken.transferFrom(msg.sender, address(this), amount),
            "Transfer failed"
        );
        remainingRewardPool += amount;
        emit RewardPoolUpdated(remainingRewardPool);
    }

    /// @notice Withdraws unused rewards
    function withdrawUnusedRewards() external onlyOwner withCooldown sufficientBalance(remainingRewardPool) {
        uint256 amount = remainingRewardPool;
        remainingRewardPool = 0;
        require(
            rewardToken.transferReward(
                owner(),
                amount,
                bytes32(getUseCaseId())
            ),
            "Transfer failed"
        );
        emit RewardPoolUpdated(0);
    }

    /// @notice Gets the use case ID from the factory
    /// @return The ID of this use case
    function getUseCaseId() internal view returns (uint256) {
        uint256 nextId = factory.nextUseCaseId();
        for (uint256 i = 0; i < nextId; i++) {
            if (factory.useCaseContracts(i) == address(this)) {
                return i;
            }
        }
        revert("Use case ID not found");
    }

    /// @notice Gets total stats for the use case
    /// @return totalAllocated Total rewards allocated
    /// @return totalClaimed Total rewards claimed
    /// @return totalRejected Total rewards rejected
    /// @return totalPending Total rewards pending
    function getUseCaseStats() external view returns (
        uint256 totalAllocated,
        uint256 totalClaimed,
        uint256 totalRejected,
        uint256 totalPending
    ) {
        uint256 nextId = factory.nextUseCaseId();
        for (uint256 i = 0; i < nextId; i++) {
            Reward[] storage rewards = participantRewards[msg.sender];
            for (uint256 j = 0; j < rewards.length; j++) {
                totalAllocated += rewards[j].amount;
                if (rewards[j].claimed) totalClaimed += rewards[j].amount;
                if (rewards[j].rejected) totalRejected += rewards[j].amount;
                if (!rewards[j].claimed && !rewards[j].rejected) {
                    totalPending += rewards[j].amount;
                }
            }
        }
    }

    /// @notice Version of the contract for tracking deployments
    string public constant VERSION = "1.0.0";
}
