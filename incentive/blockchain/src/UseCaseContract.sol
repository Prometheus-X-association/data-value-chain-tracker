// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title Use Case Contract
/// @notice Manages reward distribution use cases with configurable participant shares and lockup periods
/// @dev Implements access control and reentrancy protection for secure reward management
interface IPTXToken {
    function transfer(address to, uint256 value) external returns (bool);
    function transferFrom(address from, address to, uint256 value) external returns (bool);
    function transferReward(address from, address to, uint256 amount, bytes32 incentiveType) external;
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
    function balanceOf(address account) external view returns (uint256);
    function approve(address spender, uint256 value) external returns (bool);
    function permit(
        address owner,
        address spender,
        uint256 value,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external;
    function version() external pure returns (string memory);
}

/// @title Use Case Contract
/// @notice Manages reward distribution use cases with configurable participant shares and lockup periods
/// @dev Implements access control and reentrancy protection for secure reward management
contract UseCaseContract is AccessControl, ReentrancyGuard {
    // Custom errors
    error UseCaseAlreadyExists(string id);
    error UseCaseDoesNotExist(string id);
    error ArrayLengthMismatch();
    error ZeroAddress();
    error ZeroAmount();
    error TotalSharesExceeded();
    error RewardsAlreadyLocked();
    error RewardsNotLocked();
    error InsufficientBalance();
    error InvalidLockupPeriod();
    error NoRewardsToClaim();
    error MaxParticipantsExceeded();
    error RewardPoolOverflow();
    error NotUseCaseOwner();
    error LockupPeriodNotEnded();
    error TransferFailed();
    error ParticipantNotFound();
    error EmergencyWithdrawalFailed();

    // Constants
    uint256 public constant MAX_PARTICIPANTS = 100;
    uint256 public constant MAX_TOTAL_SHARES = 10000; // 100%
    uint256 public constant MIN_LOCKUP_PERIOD = 1 days;
    uint256 public constant MAX_LOCKUP_PERIOD = 365 days;

    /// @notice The PTX token contract used for reward distributions
    IPTXToken public immutable ptxToken;

    /// @notice Extended structure containing all use case information including participants
    /// @param id Unique identifier for the use case
    /// @param owner Address of the use case creator/owner
    /// @param totalRewardPool Total amount of tokens allocated for rewards
    /// @param remainingRewardPool Remaining rewards to be claimed
    /// @param lockupPeriod Duration for which rewards are locked
    /// @param lockTime Timestamp when rewards were locked
    /// @param rewardsLocked Boolean indicating if rewards are currently locked
    /// @param totalShares Sum of all participant shares
    /// @param participants Array of all participants and their reward shares
    struct UseCaseInfo {
        string id;
        address owner;
        uint96 totalRewardPool;
        uint96 remainingRewardPool;
        uint32 lockupPeriod;
        uint32 lockTime;
        bool rewardsLocked;
        uint256 totalShares;
        Participant[] participants;
    }

    /// @notice Structure defining a participant's reward allocation
    /// @param participant Address of the participant
    /// @param rewardShare Percentage share of rewards in basis points (100 = 1%)
    /// @param fixedReward Additional fixed amount to be paid on claim
    struct Participant {
        address participant;
        uint96 rewardShare;
        uint96 fixedReward;
    }

    // Optimized struct packing
    /// @notice Structure defining a use case's core properties
    /// @param id Unique identifier for the use case
    /// @param owner Address of the use case creator/owner
    /// @param totalRewardPool Total rewards allocated for distribution
    /// @param remainingRewardPool Remaining rewards to be claimed
    /// @param lockupPeriod Duration for which rewards are locked
    /// @param lockTime Timestamp when rewards were locked
    /// @param rewardsLocked Boolean indicating if rewards are currently locked
    struct UseCase {
        string id;                  
        address owner;              
        uint96 totalRewardPool;    // Total rewards allocated for distribution
        uint96 remainingRewardPool; // Remaining rewards to be claimed
        uint32 lockupPeriod;      
        uint32 lockTime;          
        bool rewardsLocked;        
    }

    // State variables with their respective mappings
    /// @notice Mapping from use case ID to use case details
    mapping(string => UseCase) public useCases;
    /// @notice Mapping from use case ID to array of participants
    mapping(string => Participant[]) public participants;
    /// @notice Mapping from use case ID to total reward shares
    mapping(string => uint256) public totalRewardShares;

    /// @notice Emitted when a new use case is created
    /// @param id The unique identifier of the use case
    /// @param owner The address of the use case creator
    event UseCaseCreated(string id, address owner);
    
    /// @notice Emitted when rewards are deposited to a use case
    /// @param useCaseId The identifier of the use case
    /// @param amount The amount of tokens deposited
    event RewardsDeposited(string useCaseId, uint256 amount);
    
    /// @notice Emitted when a participant's reward shares are updated
    /// @param useCaseId The identifier of the use case
    /// @param participant The address of the participant
    /// @param shares The new share amount in basis points
    event RewardSharesUpdated(string useCaseId, address participant, uint256 shares);
    
    /// @notice Emitted when a fixed reward is added for a participant
    /// @param useCaseId The identifier of the use case
    /// @param participant The address of the participant
    /// @param amount The fixed reward amount
    event FixedRewardAdded(string useCaseId, address participant, uint256 amount);
    
    /// @notice Emitted when rewards are claimed by a participant
    /// @param useCaseId The identifier of the use case
    /// @param participant The address of the participant
    /// @param amount The amount of tokens claimed
    event RewardsClaimed(string useCaseId, address participant, uint256 amount);
    
    /// @notice Emitted when rewards are locked for a period
    /// @param useCaseId The identifier of the use case
    /// @param lockupPeriod The duration of the lockup in seconds
    event RewardsLocked(string useCaseId, uint256 lockupPeriod);

    /// @notice Emitted when use case ownership is transferred
    event UseCaseOwnershipTransferred(string indexed useCaseId, address indexed previousOwner, address indexed newOwner);

    /// @notice Emitted when an emergency withdrawal occurs
    event EmergencyWithdrawal(string indexed useCaseId, address indexed owner, uint256 amount);

    /// @notice Initializes the contract with the PTX token address
    /// @param _ptxToken Address of the PTX token contract
    constructor(address _ptxToken) {
        if(_ptxToken == address(0)) revert ZeroAddress();
        ptxToken = IPTXToken(_ptxToken);
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    /// @notice Creates a new use case with the given ID
    /// @param useCaseId Unique identifier for the use case
    function createUseCase(string calldata useCaseId) external {
        if(useCases[useCaseId].owner != address(0)) revert UseCaseAlreadyExists(useCaseId);
        
        useCases[useCaseId] = UseCase({
            id: useCaseId,
            owner: msg.sender,
            totalRewardPool: 0,
            remainingRewardPool: 0,
            lockupPeriod: 0,
            lockTime: 0,
            rewardsLocked: false
        });

        emit UseCaseCreated(useCaseId, msg.sender);
    }

    /// @notice Creates a new use case with initial participants and their reward shares
    /// @param useCaseId Unique identifier for the use case
    /// @param participants_ Array of participant addresses
    /// @param shares_ Array of reward shares in basis points for each participant
    /// @param fixedRewards_ Array of fixed reward amounts for each participant
    /// @dev Arrays must be of equal length, and total shares must not exceed MAX_TOTAL_SHARES
    function createUseCaseWithParticipants(
        string calldata useCaseId,
        address[] calldata participants_,
        uint96[] calldata shares_,
        uint96[] calldata fixedRewards_
    ) external {
        if(useCases[useCaseId].owner != address(0)) revert UseCaseAlreadyExists(useCaseId);
        if(participants_.length != shares_.length || participants_.length != fixedRewards_.length) 
            revert ArrayLengthMismatch();
        if(participants_.length > MAX_PARTICIPANTS) revert MaxParticipantsExceeded();
        
        useCases[useCaseId] = UseCase({
            id: useCaseId,
            owner: msg.sender,
            totalRewardPool: 0,
            remainingRewardPool: 0,
            lockupPeriod: 0,
            lockTime: 0,
            rewardsLocked: false
        });

        if (participants_.length > 0) {
            uint256 totalShares = 0;
            for (uint256 i = 0; i < participants_.length; i++) {
                if(participants_[i] == address(0)) revert ZeroAddress();
                totalShares += shares_[i];
                if(totalShares > MAX_TOTAL_SHARES) revert TotalSharesExceeded();
                
                participants[useCaseId].push(Participant({
                    participant: participants_[i],
                    rewardShare: shares_[i],
                    fixedReward: fixedRewards_[i]
                }));
                
                emit RewardSharesUpdated(useCaseId, participants_[i], shares_[i]);
                if (fixedRewards_[i] > 0) {
                    emit FixedRewardAdded(useCaseId, participants_[i], fixedRewards_[i]);
                }
            }
            totalRewardShares[useCaseId] = totalShares;
        }

        emit UseCaseCreated(useCaseId, msg.sender);
    }

    /// @notice Transfers ownership of a use case to a new address
    /// @param useCaseId The ID of the use case
    /// @param newOwner The address of the new owner
    function transferUseCaseOwnership(
        string calldata useCaseId,
        address newOwner
    ) external {
        UseCase storage useCase = useCases[useCaseId];
        if(useCase.owner != msg.sender) revert NotUseCaseOwner();
        if(newOwner == address(0)) revert ZeroAddress();

        address previousOwner = useCase.owner;
        useCase.owner = newOwner;
        
        emit UseCaseOwnershipTransferred(useCaseId, previousOwner, newOwner);
    }

    /// @notice Modifier to check if a use case exists
    /// @param useCaseId The ID of the use case to check
    modifier useCaseExists(string calldata useCaseId) {
        if(useCases[useCaseId].owner == address(0)) revert UseCaseDoesNotExist(useCaseId);
        _;
    }

    /// @notice Modifier to restrict function access to use case owner
    /// @param useCaseId The ID of the use case
    modifier onlyUseCaseOwner(string calldata useCaseId) {
        if(useCases[useCaseId].owner != msg.sender) revert NotUseCaseOwner();
        _;
    }

    /// @notice Deposits rewards into a use case's reward pool
    /// @param useCaseId The ID of the use case
    /// @param amount The amount of tokens to deposit
    function depositRewards(string calldata useCaseId, uint256 amount) external nonReentrant useCaseExists(useCaseId) {
        if(amount == 0) revert ZeroAmount();
        UseCase storage useCase = useCases[useCaseId];

        if(ptxToken.balanceOf(msg.sender) < amount) revert InsufficientBalance();

        // Check for overflow for both pools
        uint256 newTotalPool = uint256(useCase.totalRewardPool) + amount;
        uint256 newRemainingPool = uint256(useCase.remainingRewardPool) + amount;
        if(newTotalPool > type(uint96).max || newRemainingPool > type(uint96).max) revert RewardPoolOverflow();

        ptxToken.transferReward(msg.sender, address(this), amount, keccak256(abi.encodePacked(useCaseId)));

        useCase.totalRewardPool = uint96(newTotalPool);
        useCase.remainingRewardPool = uint96(newRemainingPool);

        emit RewardsDeposited(useCaseId, amount);
    }

    /// @notice Deposits rewards using EIP-2612 permit
    /// @param useCaseId The ID of the use case
    /// @param owner The address of the owner
    /// @param amount The amount of tokens to deposit
    /// @param deadline The deadline for the permit signature
    /// @param v The v component of the permit signature
    /// @param r The r component of the permit signature
    /// @param s The s component of the permit signature
    function depositRewardsWithPermit(
        string calldata useCaseId,
        address owner,
        uint256 amount,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external nonReentrant useCaseExists(useCaseId) {
        if(amount == 0) revert ZeroAmount();
        UseCase storage useCase = useCases[useCaseId];

        // Check for overflow for both pools
        uint256 newTotalPool = uint256(useCase.totalRewardPool) + amount;
        uint256 newRemainingPool = uint256(useCase.remainingRewardPool) + amount;
        if(newTotalPool > type(uint96).max || newRemainingPool > type(uint96).max) revert RewardPoolOverflow();

        bytes32 useCaseIdBytes = keccak256(abi.encodePacked(useCaseId));

        ptxToken.transferRewardWithPermit(
            owner,
            address(this),
            address(this),
            amount,
            deadline,
            v, r, s,
            useCaseIdBytes
        );
        
        useCase.totalRewardPool = uint96(newTotalPool);
        useCase.remainingRewardPool = uint96(newRemainingPool);

        emit RewardsDeposited(useCaseId, amount);
    }

    /// @notice Updates reward shares for participants in a use case
    /// @param useCaseId The ID of the use case
    /// @param _participants Array of participant addresses
    /// @param shares Array of reward shares in basis points
    /// @dev Only callable by use case owner when rewards are not locked
    function updateRewardShares(
        string calldata useCaseId,
        address[] calldata _participants,
        uint96[] calldata shares
    ) external nonReentrant useCaseExists(useCaseId) onlyUseCaseOwner(useCaseId) {
        UseCase storage useCase = useCases[useCaseId];
        if(useCase.rewardsLocked) revert RewardsAlreadyLocked();
        if(_participants.length != shares.length) revert ArrayLengthMismatch();
        if(_participants.length > MAX_PARTICIPANTS) revert MaxParticipantsExceeded();

        delete participants[useCaseId];

        uint256 totalShares = 0;
        for (uint256 i = 0; i < _participants.length; i++) {
            if(_participants[i] == address(0)) revert ZeroAddress();
            totalShares += shares[i];
            if(totalShares > MAX_TOTAL_SHARES) revert TotalSharesExceeded();
            
            participants[useCaseId].push(Participant({
                participant: _participants[i],
                rewardShare: shares[i],
                fixedReward: 0
            }));
            
            emit RewardSharesUpdated(useCaseId, _participants[i], shares[i]);
        }

        totalRewardShares[useCaseId] = totalShares;
    }

    /// @notice Adds fixed rewards for participants
    /// @param useCaseId The ID of the use case
    /// @param _participants Array of participant addresses
    /// @param amounts Array of fixed reward amounts
    function addFixedRewards(
        string calldata useCaseId,
        address[] calldata _participants,
        uint96[] calldata amounts
    ) external nonReentrant useCaseExists(useCaseId) onlyUseCaseOwner(useCaseId) {
        if(_participants.length != amounts.length) revert ArrayLengthMismatch();
        if(useCases[useCaseId].rewardsLocked) revert RewardsAlreadyLocked();

        uint256 participantsLength = participants[useCaseId].length;
        for (uint256 i = 0; i < _participants.length; i++) {
            bool found = false;
            for (uint256 j = 0; j < participantsLength; j++) {
                if (participants[useCaseId][j].participant == _participants[i]) {
                    uint256 newFixedReward = uint256(participants[useCaseId][j].fixedReward) + amounts[i];
                    if(newFixedReward > type(uint96).max) revert RewardPoolOverflow();
                    participants[useCaseId][j].fixedReward = uint96(newFixedReward);
                    emit FixedRewardAdded(useCaseId, _participants[i], amounts[i]);
                    found = true;
                    break;
                }
            }
            if (!found) revert ParticipantNotFound();
        }
    }

    /// @notice Locks rewards for a specified period
    /// @param useCaseId The ID of the use case
    /// @param lockupPeriod The duration to lock rewards for
    function lockRewards(
        string calldata useCaseId, 
        uint32 lockupPeriod
    ) external useCaseExists(useCaseId) onlyUseCaseOwner(useCaseId) {
        if(lockupPeriod < MIN_LOCKUP_PERIOD || lockupPeriod > MAX_LOCKUP_PERIOD) revert InvalidLockupPeriod();
        UseCase storage useCase = useCases[useCaseId];
        if(useCase.rewardsLocked) revert RewardsAlreadyLocked();
        
        useCase.rewardsLocked = true;
        useCase.lockTime = uint32(block.timestamp);
        useCase.lockupPeriod = lockupPeriod;
        
        emit RewardsLocked(useCaseId, lockupPeriod);
    }

    /// @notice Allows participants to claim their rewards after lockup period
    /// @param useCaseId The ID of the use case
    /// @dev Implements reentrancy protection
    function claimRewards(string calldata useCaseId) external nonReentrant useCaseExists(useCaseId) {
        UseCase storage useCase = useCases[useCaseId];
        if(!useCase.rewardsLocked) revert RewardsNotLocked();
        if(block.timestamp < useCase.lockTime + useCase.lockupPeriod) revert LockupPeriodNotEnded();

        uint256 participantsLength = participants[useCaseId].length;
        uint256 participantIndex = type(uint256).max;
        for (uint256 i = 0; i < participantsLength; i++) {
            if (participants[useCaseId][i].participant == msg.sender) {
                participantIndex = i;
                break;
            }
        }
        if(participantIndex == type(uint256).max) revert ParticipantNotFound();

        Participant storage participant = participants[useCaseId][participantIndex];
        if(participant.rewardShare == 0 && participant.fixedReward == 0) revert NoRewardsToClaim();

        uint256 shareBasedReward = 0;
        uint256 fixedReward = 0;

        if (participant.rewardShare > 0) {
            shareBasedReward = (useCase.totalRewardPool * participant.rewardShare) / totalRewardShares[useCaseId];
            participant.rewardShare = 0;
        }

        if (participant.fixedReward > 0) {
            fixedReward = participant.fixedReward;
            participant.fixedReward = 0;
        }

        uint256 totalReward = shareBasedReward + fixedReward;
        if(totalReward == 0) revert NoRewardsToClaim();
        
        if (shareBasedReward > 0) {
            useCase.remainingRewardPool = uint96(useCase.remainingRewardPool - shareBasedReward);
        }
        
        if(!ptxToken.transfer(msg.sender, totalReward)) revert TransferFailed();

        emit RewardsClaimed(useCaseId, msg.sender, totalReward);
    }

    /// @notice Emergency withdrawal of rewards by use case owner
    /// @param useCaseId The ID of the use case
    /// @dev Only available when rewards are not locked
    function emergencyWithdraw(string calldata useCaseId) external nonReentrant useCaseExists(useCaseId) onlyUseCaseOwner(useCaseId) {
        UseCase storage useCase = useCases[useCaseId];
        if(useCase.rewardsLocked) revert RewardsAlreadyLocked();
        if(useCase.remainingRewardPool == 0) revert NoRewardsToClaim();

        uint96 amount = useCase.remainingRewardPool;
        useCase.remainingRewardPool = 0;

        if(!ptxToken.transfer(msg.sender, amount)) revert TransferFailed();

        emit EmergencyWithdrawal(useCaseId, msg.sender, amount);
    }


    /// @notice Retrieves information about a specific participant in a use case
    /// @param useCaseId The ID of the use case
    /// @param participant The address of the participant
    /// @return Participant information including shares and fixed rewards
    function getParticipantInfo(string calldata useCaseId, address participant) 
        external 
        view 
        returns (Participant memory) 
    {
        if(useCases[useCaseId].owner == address(0)) revert UseCaseDoesNotExist(useCaseId);
        
        uint256 participantsLength = participants[useCaseId].length;
        for (uint256 i = 0; i < participantsLength; i++) {
            if (participants[useCaseId][i].participant == participant) {
                return participants[useCaseId][i];
            }
        }
        return Participant(address(0), 0, 0);
    }

    /// @notice Retrieves complete information about a use case
    /// @param useCaseId The ID of the use case
    /// @return Complete use case information including participants
    function getUseCaseInfo(string calldata useCaseId) external view returns (UseCaseInfo memory) {
        UseCase storage useCase = useCases[useCaseId];
        if(useCase.owner == address(0)) revert UseCaseDoesNotExist(useCaseId);

        return UseCaseInfo({
            id: useCase.id,
            owner: useCase.owner,
            totalRewardPool: useCase.totalRewardPool,
            remainingRewardPool: useCase.remainingRewardPool,
            lockupPeriod: useCase.lockupPeriod,
            lockTime: useCase.lockTime,
            rewardsLocked: useCase.rewardsLocked,
            totalShares: totalRewardShares[useCaseId],
            participants: participants[useCaseId]
        });
    }

    /// @notice Retrieves information about multiple use cases
    /// @param useCaseIds Array of use case IDs
    /// @return Array of use case information
    function getMultipleUseCaseInfo(string[] calldata useCaseIds) 
        external 
        view 
        returns (UseCaseInfo[] memory) 
    {
        UseCaseInfo[] memory infos = new UseCaseInfo[](useCaseIds.length);
        
        for (uint256 i = 0; i < useCaseIds.length; i++) {
            UseCase storage useCase = useCases[useCaseIds[i]];
            if(useCase.owner == address(0)) revert UseCaseDoesNotExist(useCaseIds[i]);
            
            infos[i] = UseCaseInfo({
                id: useCase.id,
                owner: useCase.owner,
                totalRewardPool: useCase.totalRewardPool,
                remainingRewardPool: useCase.remainingRewardPool,
                lockupPeriod: useCase.lockupPeriod,
                lockTime: useCase.lockTime,
                rewardsLocked: useCase.rewardsLocked,
                totalShares: totalRewardShares[useCaseIds[i]],
                participants: participants[useCaseIds[i]]
            });
        }
        
        return infos;
    }
}