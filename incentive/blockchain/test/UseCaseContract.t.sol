// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {Test, console2} from "forge-std/Test.sol";
import {UseCaseContract} from "../src/UseCaseContract.sol";
import {UseCaseFactory} from "../src/UseCaseFactory.sol";
import {PTXToken} from "../src/PTXToken.sol";

contract UseCaseContractTest is Test {
    UseCaseContract public useCase;
    UseCaseFactory public factory;
    PTXToken public token;
    
    address public owner;
    address public notifier;
    address public participant;
    uint256 public constant INITIAL_SUPPLY = 1_000_000;
    uint256 public constant REWARD_POOL = 10_000;
    uint256 public constant LOCK_DURATION = 1 days;

    string[] public eventNames;
    uint256[] public baseRewards;
    
    event EventConfigured(
        bytes32 indexed eventTypeHash,
        string eventName,
        uint256 baseReward
    );
    
    event RewardAllocated(
        address indexed participant,
        bytes32 indexed eventTypeHash,
        string eventName,
        uint256 amount,
        uint256 unlockTime
    );

    event RewardClaimed(
        address indexed participant,
        uint256 totalAmount
    );

    event RewardRejected(
        address indexed participant,
        uint256 rewardIndex,
        uint256 amount
    );

    function setUp() public {
        owner = makeAddr("owner");
        notifier = makeAddr("notifier");
        participant = makeAddr("participant");

        vm.startPrank(owner);
        token = new PTXToken(INITIAL_SUPPLY);
        factory = new UseCaseFactory(address(token));
        
        // Approve factory before creating use case
        token.approve(address(factory), type(uint256).max);
        
        // Setup event configurations
        eventNames = new string[](2);
        eventNames[0] = "DataProvided";
        eventNames[1] = "QualityVerified";
        
        baseRewards = new uint256[](2);
        baseRewards[0] = 100 * 10**18;
        baseRewards[1] = 50 * 10**18;

        uint256 useCaseId = factory.createUseCase(
            LOCK_DURATION,
            eventNames,
            baseRewards,
            REWARD_POOL * 10**18  // Pass the initial reward pool
        );

        useCase = UseCaseContract(factory.useCaseContracts(useCaseId));
        factory.addGlobalNotifier(notifier);
        vm.stopPrank();
    }

    function test_InitialState() public {
        assertEq(useCase.owner(), owner);
        assertEq(address(useCase.rewardToken()), address(token));
        assertEq(useCase.lockDuration(), LOCK_DURATION);
        assertEq(useCase.remainingRewardPool(), REWARD_POOL * 10**18);
        assertFalse(useCase.paused());
    }

    function test_EventConfiguration() public {
        (string[] memory names, uint256[] memory rewards) = useCase.getSupportedEvents();
        assertEq(names.length, 2);
        assertEq(rewards.length, 2);
        assertEq(names[0], eventNames[0]);
        assertEq(names[1], eventNames[1]);
        assertEq(rewards[0], baseRewards[0]);
        assertEq(rewards[1], baseRewards[1]);
    }

    function test_NotifyEvent() public {
        uint256 factor = 0.8e18; // 80%
        
        vm.prank(notifier);
        useCase.notifyEvent(eventNames[0], participant, factor);

        // Check reward allocation
        uint256 expectedReward = (baseRewards[0] * factor) / 1e18;
        (,uint256 amount,,,,,) = useCase.participantRewards(participant, 0);
        assertEq(amount, expectedReward);
    }

    function test_NotifyEvent_RevertIfInvalidEvent() public {
        vm.prank(notifier);
        vm.expectRevert("Event type not enabled");
        useCase.notifyEvent("InvalidEvent", participant, 0.8e18);
    }

    function test_NotifyEvent_RevertIfFactorTooHigh() public {
        vm.prank(notifier);
        vm.expectRevert("Factor too high");
        useCase.notifyEvent(eventNames[0], participant, 1.1e18);
    }

    function test_NotifyEvent_RevertIfFactorTooLow() public {
        vm.prank(notifier);
        vm.expectRevert("Factor below minimum (1%)");
        useCase.notifyEvent(eventNames[0], participant, 0.009e18);
    }

    function test_NotifyEvent_EmitsEvent() public {
        uint256 factor = 0.8e18;
        bytes32 eventHash = keccak256(abi.encodePacked(eventNames[0]));
        uint256 expectedReward = (baseRewards[0] * factor) / 1e18;
        
        vm.prank(notifier);
        vm.expectEmit(true, true, false, true);
        emit RewardAllocated(
            participant,
            eventHash,
            eventNames[0],
            expectedReward,
            block.timestamp + LOCK_DURATION
        );
        useCase.notifyEvent(eventNames[0], participant, factor);
    }

    function test_ClaimRewards() public {
        // Setup: notify event and wait lock duration
        vm.prank(notifier);
        useCase.notifyEvent(eventNames[0], participant, 0.8e18);
        vm.stopPrank();
        
        // Calculate the expected reward amount
        uint256 expectedReward = (baseRewards[0] * 0.8e18) / 1e18;
        
        // Transfer tokens to the UseCase contract to cover rewards
        vm.startPrank(owner);
        token.transfer(address(useCase), expectedReward);
        vm.stopPrank();
        
        // Warp time to after the lock duration
        vm.warp(block.timestamp + LOCK_DURATION + 1);
        
        // Participant claims rewards
        vm.prank(participant);
        useCase.claimRewards();
        
        // Verify reward was claimed
        (,,,, bool claimed,,) = useCase.participantRewards(participant, 0);
        assertTrue(claimed);
        
        // Verify participant received the tokens
        assertEq(token.balanceOf(participant), expectedReward);
    }

    function test_ClaimRewards_RevertIfTooEarly() public {
        vm.prank(notifier);
        useCase.notifyEvent(eventNames[0], participant, 0.8e18);
        
        vm.prank(participant);
        vm.expectRevert("No claimable rewards");
        useCase.claimRewards();
    }

    function test_RejectReward() public {
        vm.prank(notifier);
        useCase.notifyEvent(eventNames[0], participant, 0.8e18);
        
        vm.prank(owner);
        useCase.rejectReward(participant, 0);
        
        // Verify reward was rejected
        (,,, bool rejected, bool claimed,,) = useCase.participantRewards(participant, 0);
        assertTrue(rejected);
        assertFalse(claimed);
    }

    function test_RejectReward_RevertIfNotOwner() public {
        vm.prank(notifier);
        useCase.notifyEvent(eventNames[0], participant, 0.8e18);
        
        vm.prank(participant);
        vm.expectRevert(
            abi.encodeWithSignature("OwnableUnauthorizedAccount(address)", participant)
        );
        useCase.rejectReward(participant, 0);
    }

    function test_Pause() public {
        vm.prank(owner);
        useCase.pause();
        
        assertTrue(useCase.paused());
        
        vm.prank(notifier);
        vm.expectRevert("Contract is paused");
        useCase.notifyEvent(eventNames[0], participant, 0.8e18);
    }

    function testFuzz_NotifyEvent(uint256 factor) public {
        // Bound factor between MIN_FACTOR and MAX_FACTOR
        factor = bound(factor, 0.01e18, 1e18);
        
        vm.prank(notifier);
        useCase.notifyEvent(eventNames[0], participant, factor);
        
        uint256 expectedReward = (baseRewards[0] * factor) / 1e18;
        (, uint256 amount,,,,,) = useCase.participantRewards(participant, 0);
        assertEq(amount, expectedReward);
    }

    function test_TopUpRewardPool() public {
        uint256 amount = 1000 * 10**18;
        uint256 initialPool = useCase.remainingRewardPool();
        
        vm.startPrank(owner);
        token.approve(address(useCase), amount);
        useCase.topUpRewardPool(amount);
        vm.stopPrank();
        
        assertEq(useCase.remainingRewardPool(), initialPool + amount);
    }

    function test_WithdrawUnusedRewards() public {
        uint256 initialBalance = token.balanceOf(owner);
        uint256 poolAmount = useCase.remainingRewardPool();
        
        // Transfer tokens to the UseCase contract first
        vm.startPrank(owner);
        token.transfer(address(useCase), poolAmount);
        
        // Warp time forward to bypass cooldown
        vm.warp(block.timestamp + 1 days);
        
        // Withdraw unused rewards
        useCase.withdrawUnusedRewards();
        vm.stopPrank();
        
        assertEq(token.balanceOf(owner), initialBalance);  // Should be back to initial balance
        assertEq(useCase.remainingRewardPool(), 0);
    }

    function test_EmergencyWithdraw() public {
        vm.startPrank(owner);
        useCase.pause();
        useCase.emergencyWithdraw();
        vm.stopPrank();
        
        assertEq(token.balanceOf(address(useCase)), 0);
    }

    function test_GetUseCaseStats() public {
        (
            uint256 totalAllocated,
            uint256 totalClaimed,
            uint256 totalRejected,
            uint256 totalPending,
            uint256 rewardPool,
            uint256 remainingRewardPool,
            bool isActive
        ) = useCase.getUseCaseStats();
        
        assertEq(totalAllocated, 0);
        assertEq(totalClaimed, 0);
        assertEq(totalRejected, 0);
        assertEq(totalPending, 0);
        assertEq(rewardPool, REWARD_POOL * 10**18);
        assertEq(remainingRewardPool, REWARD_POOL * 10**18);
        assertTrue(isActive);
    }
}
