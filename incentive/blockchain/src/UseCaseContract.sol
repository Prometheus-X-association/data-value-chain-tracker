// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title PTX token interface used by the use case contract
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
/// @dev Every use case is accounted for separately: the sum of all payouts of a use case can never
///      exceed the tokens deposited into that use case, even though all use cases share one token balance.
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
    error DuplicateParticipant(address participant);
    error FixedRewardsExceedPool();
    error NotAuthorizedDepositor();
    error NothingToWithdraw();

    /// @notice Role allowed to submit permit-based deposits on behalf of token owners (the incentive API)
    bytes32 public constant RELAYER_ROLE = keccak256("RELAYER_ROLE");

    // Constants
    uint256 public constant MAX_PARTICIPANTS = 100;
    uint256 public constant MAX_TOTAL_SHARES = 10000; // 100%
    uint256 public constant MIN_LOCKUP_PERIOD = 60;
    uint256 public constant MAX_LOCKUP_PERIOD = 365 days;

    /// @notice The PTX token contract used for reward distributions
    IPTXToken public immutable ptxToken;

    /// @notice Extended structure containing all use case information including participants
    /// @param id Unique identifier for the use case
    /// @param owner Address of the use case creator/owner
    /// @param totalRewardPool Total amount of tokens deposited for rewards
    /// @param remainingRewardPool Deposited rewards not yet paid out
    /// @param lockupPeriod Duration for which rewards are locked
    /// @param lockTime Timestamp when rewards were locked
    /// @param rewardsLocked Boolean indicating if rewards are currently locked
    /// @param totalShares Sum of all participant shares
    /// @param participants Array of all participants and their reward shares
    /// @param totalFixedRewards Part of the pool reserved for fixed rewards
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
        uint256 totalFixedRewards;
    }

    /// @notice Structure defining a participant's reward allocation
    /// @param participant Address of the participant
    /// @param rewardShare Share of the (non-fixed) pool, relative to the sum of all shares
    /// @param fixedReward Fixed amount paid on claim, funded from the same use case pool
    struct Participant {
        address participant;
        uint96 rewardShare;
        uint96 fixedReward;
    }

    /// @notice Structure defining a use case's core properties
    struct UseCase {
        string id;
        address owner;
        uint96 totalRewardPool;
        uint96 remainingRewardPool;
        uint32 lockupPeriod;
        uint32 lockTime;
        bool rewardsLocked;
    }

    /// @notice Mapping from use case ID to use case details
    mapping(string => UseCase) public useCases;
    /// @notice Mapping from use case ID to array of participants
    mapping(string => Participant[]) public participants;
    /// @notice Mapping from use case ID to total reward shares
    mapping(string => uint256) public totalRewardShares;
    /// @notice Mapping from use case ID to the sum of all fixed rewards
    mapping(string => uint256) public totalFixedRewards;
    /// @notice Mapping from use case ID to depositor to the amount deposited (refundable before lock)
    mapping(string => mapping(address => uint256)) public deposits;

    event UseCaseCreated(string id, address owner);
    event RewardsDeposited(string useCaseId, uint256 amount);
    event RewardSharesUpdated(string useCaseId, address participant, uint256 shares);
    event FixedRewardAdded(string useCaseId, address participant, uint256 amount);
    event RewardsClaimed(string useCaseId, address participant, uint256 amount);
    event RewardsLocked(string useCaseId, uint256 lockupPeriod);
    event UseCaseOwnershipTransferred(string indexed useCaseId, address indexed previousOwner, address indexed newOwner);
    /// @notice Emitted when a depositor withdraws its deposit before the rewards are locked
    event EmergencyWithdrawal(string indexed useCaseId, address indexed depositor, uint256 amount);

    /// @notice Initializes the contract with the PTX token address
    /// @param _ptxToken Address of the PTX token contract
    constructor(address _ptxToken) {
        if(_ptxToken == address(0)) revert ZeroAddress();
        ptxToken = IPTXToken(_ptxToken);
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    /// @notice Modifier to check if a use case exists
    modifier useCaseExists(string calldata useCaseId) {
        if(useCases[useCaseId].owner == address(0)) revert UseCaseDoesNotExist(useCaseId);
        _;
    }

    /// @notice Modifier to restrict function access to use case owner
    modifier onlyUseCaseOwner(string calldata useCaseId) {
        if(useCases[useCaseId].owner != msg.sender) revert NotUseCaseOwner();
        _;
    }

    /// @notice Modifier to restrict changes to use cases whose rewards are not locked yet
    modifier notLocked(string calldata useCaseId) {
        if(useCases[useCaseId].rewardsLocked) revert RewardsAlreadyLocked();
        _;
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
    /// @dev Fixed rewards are only a reservation: the use case cannot be locked until its
    ///      deposits cover the sum of all fixed rewards.
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
        _requireUniqueParticipants(participants_);

        useCases[useCaseId] = UseCase({
            id: useCaseId,
            owner: msg.sender,
            totalRewardPool: 0,
            remainingRewardPool: 0,
            lockupPeriod: 0,
            lockTime: 0,
            rewardsLocked: false
        });

        uint256 totalShares = 0;
        uint256 fixedTotal = 0;
        for (uint256 i = 0; i < participants_.length; i++) {
            if(participants_[i] == address(0)) revert ZeroAddress();
            totalShares += shares_[i];
            if(totalShares > MAX_TOTAL_SHARES) revert TotalSharesExceeded();
            fixedTotal += fixedRewards_[i];

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
        totalFixedRewards[useCaseId] = fixedTotal;

        emit UseCaseCreated(useCaseId, msg.sender);
    }

    /// @notice Transfers ownership of a use case to a new address
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

    /// @notice Deposits rewards from the caller into a use case's reward pool
    /// @dev Requires the caller to have approved this contract for `amount`
    function depositRewards(string calldata useCaseId, uint256 amount)
        external
        nonReentrant
        useCaseExists(useCaseId)
        notLocked(useCaseId)
    {
        if(amount == 0) revert ZeroAmount();
        if(ptxToken.balanceOf(msg.sender) < amount) revert InsufficientBalance();
        _creditDeposit(useCaseId, msg.sender, amount);

        ptxToken.transferReward(msg.sender, address(this), amount, keccak256(abi.encodePacked(useCaseId)));

        emit RewardsDeposited(useCaseId, amount);
    }

    /// @notice Deposits rewards using an EIP-2612 permit signed by `owner`
    /// @dev The permit does not commit to a use case, so only the token owner itself or a trusted
    ///      relayer may submit it. Otherwise anyone who saw the signature could route the owner's
    ///      tokens into a use case of their choosing.
    function depositRewardsWithPermit(
        string calldata useCaseId,
        address owner,
        uint256 amount,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external nonReentrant useCaseExists(useCaseId) notLocked(useCaseId) {
        if(msg.sender != owner && !hasRole(RELAYER_ROLE, msg.sender)) revert NotAuthorizedDepositor();
        if(amount == 0) revert ZeroAmount();
        _creditDeposit(useCaseId, owner, amount);

        ptxToken.transferRewardWithPermit(
            owner,
            address(this),
            address(this),
            amount,
            deadline,
            v, r, s,
            keccak256(abi.encodePacked(useCaseId))
        );

        emit RewardsDeposited(useCaseId, amount);
    }

    /// @notice Replaces the participants of a use case and their reward shares
    /// @dev Only callable by the use case owner while rewards are not locked. Clears fixed rewards.
    function updateRewardShares(
        string calldata useCaseId,
        address[] calldata _participants,
        uint96[] calldata shares
    ) external nonReentrant useCaseExists(useCaseId) onlyUseCaseOwner(useCaseId) notLocked(useCaseId) {
        if(_participants.length != shares.length) revert ArrayLengthMismatch();
        if(_participants.length > MAX_PARTICIPANTS) revert MaxParticipantsExceeded();
        _requireUniqueParticipants(_participants);

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
        totalFixedRewards[useCaseId] = 0;
    }

    /// @notice Adds fixed rewards for existing participants
    /// @dev Fixed rewards are paid from this use case's own pool; locking requires the pool to cover them.
    function addFixedRewards(
        string calldata useCaseId,
        address[] calldata _participants,
        uint96[] calldata amounts
    ) external nonReentrant useCaseExists(useCaseId) onlyUseCaseOwner(useCaseId) notLocked(useCaseId) {
        if(_participants.length != amounts.length) revert ArrayLengthMismatch();

        uint256 participantsLength = participants[useCaseId].length;
        uint256 fixedTotal = totalFixedRewards[useCaseId];
        for (uint256 i = 0; i < _participants.length; i++) {
            bool found = false;
            for (uint256 j = 0; j < participantsLength; j++) {
                if (participants[useCaseId][j].participant == _participants[i]) {
                    uint256 newFixedReward = uint256(participants[useCaseId][j].fixedReward) + amounts[i];
                    if(newFixedReward > type(uint96).max) revert RewardPoolOverflow();
                    participants[useCaseId][j].fixedReward = uint96(newFixedReward);
                    fixedTotal += amounts[i];
                    emit FixedRewardAdded(useCaseId, _participants[i], amounts[i]);
                    found = true;
                    break;
                }
            }
            if (!found) revert ParticipantNotFound();
        }
        totalFixedRewards[useCaseId] = fixedTotal;
    }

    /// @notice Locks rewards for a specified period. After locking, deposits and shares are frozen.
    function lockRewards(
        string calldata useCaseId,
        uint32 lockupPeriod
    ) external useCaseExists(useCaseId) onlyUseCaseOwner(useCaseId) notLocked(useCaseId) {
        if(lockupPeriod < MIN_LOCKUP_PERIOD || lockupPeriod > MAX_LOCKUP_PERIOD) revert InvalidLockupPeriod();
        UseCase storage useCase = useCases[useCaseId];
        if(totalFixedRewards[useCaseId] > useCase.totalRewardPool) revert FixedRewardsExceedPool();

        useCase.rewardsLocked = true;
        useCase.lockTime = uint32(block.timestamp);
        useCase.lockupPeriod = lockupPeriod;

        emit RewardsLocked(useCaseId, lockupPeriod);
    }

    /// @notice Allows a participant to claim its rewards after the lockup period
    function claimRewards(string calldata useCaseId) external nonReentrant useCaseExists(useCaseId) {
        _requireLockupEnded(useCaseId);

        uint256 participantsLength = participants[useCaseId].length;
        for (uint256 i = 0; i < participantsLength; i++) {
            if (participants[useCaseId][i].participant == msg.sender) {
                if(_payout(useCaseId, i) == 0) revert NoRewardsToClaim();
                return;
            }
        }
        revert ParticipantNotFound();
    }

    /// @notice Pushes the outstanding rewards of every participant after the lockup period
    /// @dev Lets the use case owner settle a use case without needing the participants' keys.
    ///      Participants that already claimed are skipped.
    function distribute(string calldata useCaseId)
        external
        nonReentrant
        useCaseExists(useCaseId)
        onlyUseCaseOwner(useCaseId)
    {
        _requireLockupEnded(useCaseId);

        uint256 paidOut = 0;
        uint256 participantsLength = participants[useCaseId].length;
        for (uint256 i = 0; i < participantsLength; i++) {
            paidOut += _payout(useCaseId, i);
        }
        if(paidOut == 0) revert NoRewardsToClaim();
    }

    /// @notice Withdraws the caller's own deposit from a use case whose rewards are not locked yet
    /// @dev Refunds only what the caller deposited; a use case owner cannot take other depositors' funds.
    function emergencyWithdraw(string calldata useCaseId)
        external
        nonReentrant
        useCaseExists(useCaseId)
        notLocked(useCaseId)
    {
        uint256 amount = deposits[useCaseId][msg.sender];
        if(amount == 0) revert NothingToWithdraw();

        UseCase storage useCase = useCases[useCaseId];
        deposits[useCaseId][msg.sender] = 0;
        useCase.totalRewardPool = uint96(uint256(useCase.totalRewardPool) - amount);
        useCase.remainingRewardPool = uint96(uint256(useCase.remainingRewardPool) - amount);

        if(!ptxToken.transfer(msg.sender, amount)) revert TransferFailed();

        emit EmergencyWithdrawal(useCaseId, msg.sender, amount);
    }

    /// @notice Retrieves information about a specific participant in a use case
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
    function getUseCaseInfo(string calldata useCaseId) external view returns (UseCaseInfo memory) {
        if(useCases[useCaseId].owner == address(0)) revert UseCaseDoesNotExist(useCaseId);
        return _useCaseInfo(useCaseId);
    }

    /// @notice Retrieves information about multiple use cases
    function getMultipleUseCaseInfo(string[] calldata useCaseIds)
        external
        view
        returns (UseCaseInfo[] memory)
    {
        UseCaseInfo[] memory infos = new UseCaseInfo[](useCaseIds.length);

        for (uint256 i = 0; i < useCaseIds.length; i++) {
            if(useCases[useCaseIds[i]].owner == address(0)) revert UseCaseDoesNotExist(useCaseIds[i]);
            infos[i] = _useCaseInfo(useCaseIds[i]);
        }

        return infos;
    }

    function _useCaseInfo(string calldata useCaseId) internal view returns (UseCaseInfo memory) {
        UseCase storage useCase = useCases[useCaseId];
        return UseCaseInfo({
            id: useCase.id,
            owner: useCase.owner,
            totalRewardPool: useCase.totalRewardPool,
            remainingRewardPool: useCase.remainingRewardPool,
            lockupPeriod: useCase.lockupPeriod,
            lockTime: useCase.lockTime,
            rewardsLocked: useCase.rewardsLocked,
            totalShares: totalRewardShares[useCaseId],
            participants: participants[useCaseId],
            totalFixedRewards: totalFixedRewards[useCaseId]
        });
    }

    function _creditDeposit(string calldata useCaseId, address depositor, uint256 amount) internal {
        UseCase storage useCase = useCases[useCaseId];
        uint256 newTotalPool = uint256(useCase.totalRewardPool) + amount;
        uint256 newRemainingPool = uint256(useCase.remainingRewardPool) + amount;
        if(newTotalPool > type(uint96).max || newRemainingPool > type(uint96).max) revert RewardPoolOverflow();

        useCase.totalRewardPool = uint96(newTotalPool);
        useCase.remainingRewardPool = uint96(newRemainingPool);
        deposits[useCaseId][depositor] += amount;
    }

    function _requireLockupEnded(string calldata useCaseId) internal view {
        UseCase storage useCase = useCases[useCaseId];
        if(!useCase.rewardsLocked) revert RewardsNotLocked();
        if(block.timestamp < uint256(useCase.lockTime) + useCase.lockupPeriod) revert LockupPeriodNotEnded();
    }

    /// @dev Pays participant `index` everything it is still owed and returns the amount paid.
    ///      Share-based rewards split the pool minus the fixed-reward reservation, so the total
    ///      paid out by a use case never exceeds its deposits.
    function _payout(string calldata useCaseId, uint256 index) internal returns (uint256) {
        Participant storage participant = participants[useCaseId][index];
        UseCase storage useCase = useCases[useCaseId];

        uint256 shareBasedReward = 0;
        if (participant.rewardShare > 0) {
            uint256 sharePool = uint256(useCase.totalRewardPool) - totalFixedRewards[useCaseId];
            shareBasedReward = (sharePool * participant.rewardShare) / totalRewardShares[useCaseId];
            participant.rewardShare = 0;
        }

        uint256 fixedReward = participant.fixedReward;
        participant.fixedReward = 0;

        uint256 totalReward = shareBasedReward + fixedReward;
        if (totalReward == 0) {
            return 0;
        }

        useCase.remainingRewardPool = uint96(uint256(useCase.remainingRewardPool) - totalReward);

        address recipient = participant.participant;
        if(!ptxToken.transfer(recipient, totalReward)) revert TransferFailed();

        emit RewardsClaimed(useCaseId, recipient, totalReward);
        return totalReward;
    }

    function _requireUniqueParticipants(address[] calldata list) internal pure {
        for (uint256 i = 0; i < list.length; i++) {
            for (uint256 j = i + 1; j < list.length; j++) {
                if (list[i] == list[j]) revert DuplicateParticipant(list[i]);
            }
        }
    }
}
