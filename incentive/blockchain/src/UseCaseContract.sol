// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

// Not used as of now. But certain admin safety features might be a good idea.
// I.e. pausing the contract
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {console2} from "forge-std/console2.sol";

interface IPTXToken {
    function transfer(address to, uint256 value) external returns (bool);
    function transferFrom(address from, address to, uint256 value) external returns (bool);
    function transferReward(address from, address to, uint256 amount, bytes32 incentiveType) external;
    function transferRewardWithPermit(
        address owner,
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

contract UseCaseContract is AccessControl, ReentrancyGuard {
    IPTXToken public ptxToken;

    struct UseCase {
        string id;                  
        address owner;              
        uint256 rewardPool;        
        uint256 lockupPeriod;      
        uint256 lockTime;          // When rewards were locked
        bool rewardsLocked;        // If rewards are locked
    }

    struct UseCaseInfo {
        string id;
        address owner;
        uint256 rewardPool;
        uint256 lockupPeriod;
        uint256 lockTime;
        bool rewardsLocked;
        uint256 totalShares;
        Participant[] participants; 
    }

    struct Participant {
        address participant;
        uint256 rewardShare;       // Share of rewards (in basis points, 1% = 100)
        uint256 fixedReward;       // Additional fixed amount to be paid on claim
    }

    // Use case mappings
    mapping(string => UseCase) public useCases;
    mapping(string => Participant[]) public participants;
    mapping(string => uint256) public totalRewardShares; // Total shares per use case

    event UseCaseCreated(string id, address owner);
    event RewardsDeposited(string useCaseId, uint256 amount);
    event RewardSharesUpdated(string useCaseId, address participant, uint256 shares);
    event FixedRewardAdded(string useCaseId, address participant, uint256 amount);
    event RewardsClaimed(string useCaseId, address participant, uint256 amount);
    event RewardsLocked(string useCaseId, uint256 lockupPeriod);

    constructor(address _ptxToken) {
        ptxToken = IPTXToken(_ptxToken);
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    function createUseCase(string calldata useCaseId) external {
        require(useCases[useCaseId].owner == address(0), "Use case already exists");
        
        useCases[useCaseId] = UseCase({
            id: useCaseId,
            owner: msg.sender,
            rewardPool: 0,
            lockupPeriod: 0,
            lockTime: 0,
            rewardsLocked: false
        });

        emit UseCaseCreated(useCaseId, msg.sender);
    }

    modifier useCaseExists(string calldata useCaseId) {
        address useCaseOwner = useCases[useCaseId].owner;
        require(useCases[useCaseId].owner != address(0), "Use case doesn't exist");
        _;
    }

    modifier onlyUseCaseOwner(string calldata useCaseId) {
        address useCaseOwner = useCases[useCaseId].owner;
        require(useCases[useCaseId].owner == msg.sender, "Only owner can call");
        _;
    }

    function depositRewards(string calldata useCaseId, uint256 amount) external useCaseExists(useCaseId) {
        require(amount > 0, "Amount must be greater than zero");
        UseCase storage useCase = useCases[useCaseId];

        require(ptxToken.balanceOf(msg.sender) >= amount, "Insufficient token balance");

        ptxToken.transferReward(msg.sender, address(this), amount, keccak256(abi.encodePacked(useCaseId)));

        useCase.rewardPool += amount;

        emit RewardsDeposited(useCaseId, amount);
    }

    function depositRewardsWithPermit(
        string calldata useCaseId,
        uint256 amount,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external useCaseExists(useCaseId) {
        UseCase storage useCase = useCases[useCaseId];

        // Convert string to bytes32 for the incentiveType parameter
        bytes32 useCaseIdBytes = keccak256(abi.encodePacked(useCaseId));

        ptxToken.transferRewardWithPermit(
            msg.sender,    // owner
            address(this), // to
            amount,        // amount
            deadline,      // deadline
            v, r, s,      // signature parameters
            useCaseIdBytes // incentiveType
        );
        
        useCase.rewardPool += amount;

        emit RewardsDeposited(useCaseId, amount);
    }

    function updateRewardShares(
        string calldata useCaseId,
        address[] calldata _participants,
        uint256[] calldata shares
    ) external useCaseExists(useCaseId) onlyUseCaseOwner(useCaseId) {
        UseCase storage useCase = useCases[useCaseId];
        require(!useCase.rewardsLocked, "Rewards are locked");
        require(_participants.length == shares.length, "Array lengths mismatch");

        delete participants[useCaseId];

        // Set new shares
        uint256 totalShares = 0;
        for (uint256 i = 0; i < _participants.length; i++) {
            require(_participants[i] != address(0), "Zero address not allowed");
            totalShares += shares[i];
            participants[useCaseId].push(Participant({
                participant: _participants[i],
                rewardShare: shares[i],
                fixedReward: 0
            }));
            emit RewardSharesUpdated(useCaseId, _participants[i], shares[i]);
        }

        totalRewardShares[useCaseId] = totalShares;
        require(totalShares <= 10000, "Total shares exceed 100%");
    }

    function addFixedRewards(
        string calldata useCaseId,
        address[] calldata _participants,
        uint256[] calldata amounts
    ) external useCaseExists(useCaseId) onlyUseCaseOwner(useCaseId) {
        require(_participants.length == amounts.length, "Array lengths mismatch");

        for (uint256 i = 0; i < _participants.length; i++) {
            for (uint256 j = 0; j < participants[useCaseId].length; j++) {
                if (participants[useCaseId][j].participant == _participants[i]) {
                    participants[useCaseId][j].fixedReward += amounts[i];
                    emit FixedRewardAdded(useCaseId, _participants[i], amounts[i]);
                    break;
                }
            }
        }
    }

    function lockRewards(
		string calldata useCaseId, 
		uint256 lockupPeriod
	) external useCaseExists(useCaseId) onlyUseCaseOwner(useCaseId) {
        require(lockupPeriod > 0, "Lockup period must be greater than zero");
        UseCase storage useCase = useCases[useCaseId];
        require(!useCase.rewardsLocked, "Rewards already locked");
        
        useCase.rewardsLocked = true;
        useCase.lockTime = block.timestamp;
        useCase.lockupPeriod = lockupPeriod;
        
        emit RewardsLocked(useCaseId, lockupPeriod);
    }

    function claimRewards(string calldata useCaseId) external nonReentrant useCaseExists(useCaseId) {
        UseCase storage useCase = useCases[useCaseId];
        require(useCase.rewardsLocked, "Rewards not locked yet");
        require(
            block.timestamp >= useCase.lockTime + useCase.lockupPeriod,
            "Lockup period not ended"
        );

        Participant memory participant;
        for (uint256 i = 0; i < participants[useCaseId].length; i++) {
            if (participants[useCaseId][i].participant == msg.sender) {
                participant = participants[useCaseId][i];
                break;
            }
        }

        require(participant.rewardShare > 0 || participant.fixedReward > 0, "No rewards to claim");

        uint256 totalReward = 0;

        // Calculate percentage-based reward if participant has shares
        if (participant.rewardShare > 0) {
            uint256 shareReward = (useCase.rewardPool * participant.rewardShare) / totalRewardShares[useCaseId];
            totalReward += shareReward;
        }

        // Add fixed reward if any
        if (participant.fixedReward > 0) {
            totalReward += participant.fixedReward;
            participant.fixedReward = 0; // Reset fixed reward after claiming
        }

        // Reset reward share after claiming
        participant.rewardShare = 0;

        require(totalReward > 0, "No rewards to transfer");
        require(
            ptxToken.transfer(msg.sender, totalReward),
            "Reward transfer failed"
        );

        emit RewardsClaimed(useCaseId, msg.sender, totalReward);
    }

    function getUseCaseInfo(string calldata useCaseId) external view returns (UseCaseInfo memory) {
        UseCase storage useCase = useCases[useCaseId];
        require(useCase.owner != address(0), "Use case doesn't exist");

        return UseCaseInfo({
            id: useCase.id,
            owner: useCase.owner,
            rewardPool: useCase.rewardPool,
            lockupPeriod: useCase.lockupPeriod,
            lockTime: useCase.lockTime,
            rewardsLocked: useCase.rewardsLocked,
            totalShares: totalRewardShares[useCaseId],
            participants: participants[useCaseId]
        });
    }

    function getParticipantInfo(string calldata useCaseId, address participant) external view returns (Participant memory) {
        require(useCases[useCaseId].owner != address(0), "Use case doesn't exist");
        for (uint256 i = 0; i < participants[useCaseId].length; i++) {
            if (participants[useCaseId][i].participant == participant) {
                return participants[useCaseId][i];
            }
        }
        return Participant(address(0), 0, 0);
    }
}