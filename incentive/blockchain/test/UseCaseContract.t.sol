// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {Test, console2} from "forge-std/Test.sol";
import {UseCaseContract} from "../src/UseCaseContract.sol";
import {PTXToken} from "../src/PTXToken.sol";

contract UseCaseContractTest is Test {
    UseCaseContract public useCase;
    PTXToken public token;

    address public owner;
    address public participant1;
    address public participant2;
    string public useCaseId = "TestUseCase";
    uint256 public constant INITIAL_SUPPLY = 1_000_000 ether;

    function setUp() public {
        owner = makeAddr("owner");
        participant1 = makeAddr("participant1");
        participant2 = makeAddr("participant2");
        
        vm.startPrank(owner);
        token = new PTXToken(INITIAL_SUPPLY);
        useCase = new UseCaseContract(address(token));
        vm.stopPrank();
    }

    function test_CreateUseCase() public {
        vm.prank(owner);
        useCase.createUseCase(useCaseId);

        UseCaseContract.UseCaseInfo memory info = useCase.getUseCaseInfo(useCaseId);
        assertEq(info.id, useCaseId);
        assertEq(info.owner, owner);
        assertEq(info.totalRewardPool, 0);
        assertEq(info.remainingRewardPool, 0);
        assertFalse(info.rewardsLocked);
    }

    function test_CreateUseCaseWithParticipants() public {
        address[] memory participants = new address[](2);
        uint96[] memory shares = new uint96[](2);
        uint96[] memory fixedRewards = new uint96[](2);
        
        participants[0] = participant1;
        participants[1] = participant2;
        shares[0] = 5000; // 50%
        shares[1] = 5000; // 50%
        fixedRewards[0] = 100 ether;
        fixedRewards[1] = 200 ether;

        vm.prank(owner);
        useCase.createUseCaseWithParticipants(useCaseId, participants, shares, fixedRewards);

        UseCaseContract.UseCaseInfo memory info = useCase.getUseCaseInfo(useCaseId);
        assertEq(info.participants.length, 2);
        assertEq(info.totalShares, 10000);
    }

    function test_RevertWhen_CreateDuplicateUseCase() public {
        vm.startPrank(owner);
        useCase.createUseCase(useCaseId);
        
        vm.expectRevert(abi.encodeWithSelector(UseCaseContract.UseCaseAlreadyExists.selector, useCaseId));
        useCase.createUseCase(useCaseId);
        vm.stopPrank();
    }

    function test_DepositRewards() public {
        vm.startPrank(owner);
        useCase.createUseCase(useCaseId);
        token.approve(address(useCase), 1000 ether);
        useCase.depositRewards(useCaseId, 1000 ether);
        vm.stopPrank();

        UseCaseContract.UseCaseInfo memory info = useCase.getUseCaseInfo(useCaseId);
        assertEq(info.totalRewardPool, 1000 ether);
        assertEq(info.remainingRewardPool, 1000 ether);
    }

    function test_RevertWhen_DepositZeroRewards() public {
        vm.prank(owner);
        useCase.createUseCase(useCaseId);

        vm.expectRevert(UseCaseContract.ZeroAmount.selector);
        useCase.depositRewards(useCaseId, 0);
    }

    function test_UpdateRewardShares() public {
        vm.startPrank(owner);
        useCase.createUseCase(useCaseId);
        
        address[] memory participants = new address[](2);
        uint96[] memory shares = new uint96[](2);
        participants[0] = participant1;
        participants[1] = participant2;
        shares[0] = 6000; // 60%
        shares[1] = 4000; // 40%

        useCase.updateRewardShares(useCaseId, participants, shares);
        vm.stopPrank();

        UseCaseContract.UseCaseInfo memory info = useCase.getUseCaseInfo(useCaseId);
        assertEq(info.totalShares, 10000);
        assertEq(info.participants[0].rewardShare, 6000);
        assertEq(info.participants[1].rewardShare, 4000);
    }

    function test_RevertWhen_UpdateSharesExceedsMax() public {
        vm.startPrank(owner);
        useCase.createUseCase(useCaseId);
        
        address[] memory participants = new address[](2);
        uint96[] memory shares = new uint96[](2);
        participants[0] = participant1;
        participants[1] = participant2;
        shares[0] = 6000;
        shares[1] = 5000; // Total > 100%

        vm.expectRevert(UseCaseContract.TotalSharesExceeded.selector);
        useCase.updateRewardShares(useCaseId, participants, shares);
        vm.stopPrank();
    }

    function test_LockRewards() public {
        vm.startPrank(owner);
        useCase.createUseCase(useCaseId);
        useCase.lockRewards(useCaseId, 1 days);
        vm.stopPrank();

        UseCaseContract.UseCaseInfo memory info = useCase.getUseCaseInfo(useCaseId);
        assertTrue(info.rewardsLocked);
        assertEq(info.lockupPeriod, 1 days);
    }

    function test_RevertWhen_LockRewardsAgain() public {
        vm.startPrank(owner);
        useCase.createUseCase(useCaseId);
        useCase.lockRewards(useCaseId, 1 days);
        
        vm.expectRevert(UseCaseContract.RewardsAlreadyLocked.selector);
        useCase.lockRewards(useCaseId, 1 days);
        vm.stopPrank();
    }

    function test_ClaimRewards() public {
        // Setup use case with rewards
        vm.startPrank(owner);
        useCase.createUseCase(useCaseId);
        token.approve(address(useCase), 1000 ether);
        useCase.depositRewards(useCaseId, 1000 ether);
        
        address[] memory participants = new address[](1);
        uint96[] memory shares = new uint96[](1);
        participants[0] = participant1;
        shares[0] = 10000; // 100%
        useCase.updateRewardShares(useCaseId, participants, shares);
        useCase.lockRewards(useCaseId, 1 days);
        vm.stopPrank();

        // Warp time and claim
        vm.warp(block.timestamp + 1 days + 1);
        vm.prank(participant1);
        useCase.claimRewards(useCaseId);

        UseCaseContract.UseCaseInfo memory info = useCase.getUseCaseInfo(useCaseId);
        assertEq(info.totalRewardPool, 1000 ether);
        assertEq(info.remainingRewardPool, 0);
        assertEq(token.balanceOf(participant1), 1000 ether);
    }

    function test_PartialClaimRewards() public {
        vm.startPrank(owner);
        useCase.createUseCase(useCaseId);
        token.approve(address(useCase), 1000 ether);
        useCase.depositRewards(useCaseId, 1000 ether);
        
        address[] memory participants = new address[](2);
        uint96[] memory shares = new uint96[](2);
        participants[0] = participant1;
        participants[1] = participant2;
        shares[0] = 6000; // 60%
        shares[1] = 4000; // 40%
        useCase.updateRewardShares(useCaseId, participants, shares);
        useCase.lockRewards(useCaseId, 1 days);
        vm.stopPrank();

        // Warp time and claim for first participant
        vm.warp(block.timestamp + 1 days + 1);
        vm.prank(participant1);
        useCase.claimRewards(useCaseId);

        UseCaseContract.UseCaseInfo memory info = useCase.getUseCaseInfo(useCaseId);
        assertEq(info.totalRewardPool, 1000 ether);
        assertEq(info.remainingRewardPool, 400 ether);
        assertEq(token.balanceOf(participant1), 600 ether);
    }

    function test_RevertWhen_ClaimBeforeLockupEnds() public {
        vm.startPrank(owner);
        useCase.createUseCase(useCaseId);
        token.approve(address(useCase), 1000 ether);
        useCase.depositRewards(useCaseId, 1000 ether);
        
        address[] memory participants = new address[](1);
        uint96[] memory shares = new uint96[](1);
        participants[0] = participant1;
        shares[0] = 10000;
        useCase.updateRewardShares(useCaseId, participants, shares);
        useCase.lockRewards(useCaseId, 1 days);
        vm.stopPrank();

        vm.prank(participant1);
        vm.expectRevert(UseCaseContract.LockupPeriodNotEnded.selector);
        useCase.claimRewards(useCaseId);
    }

    function test_EmergencyWithdraw() public {
        vm.startPrank(owner);
        useCase.createUseCase(useCaseId);
        token.approve(address(useCase), 1000 ether);
        useCase.depositRewards(useCaseId, 1000 ether);
        
        uint256 balanceBefore = token.balanceOf(owner);
        useCase.emergencyWithdraw(useCaseId);
        uint256 balanceAfter = token.balanceOf(owner);
        
        UseCaseContract.UseCaseInfo memory info = useCase.getUseCaseInfo(useCaseId);
        assertEq(info.totalRewardPool, 0);
        assertEq(info.remainingRewardPool, 0);
        assertEq(balanceAfter - balanceBefore, 1000 ether);
        vm.stopPrank();
    }

    function test_RevertWhen_EmergencyWithdrawLockedRewards() public {
        vm.startPrank(owner);
        useCase.createUseCase(useCaseId);
        token.approve(address(useCase), 1000 ether);
        useCase.depositRewards(useCaseId, 1000 ether);
        useCase.lockRewards(useCaseId, 1 days);
        
        vm.expectRevert(UseCaseContract.RewardsAlreadyLocked.selector);
        useCase.emergencyWithdraw(useCaseId);
        vm.stopPrank();
    }

    function test_TransferUseCaseOwnership() public {
        vm.prank(owner);
        useCase.createUseCase(useCaseId);

        vm.prank(owner);
        useCase.transferUseCaseOwnership(useCaseId, participant1);

        UseCaseContract.UseCaseInfo memory info = useCase.getUseCaseInfo(useCaseId);
        assertEq(info.owner, participant1);
    }

    function test_RevertWhen_NonOwnerTransfersOwnership() public {
        vm.prank(owner);
        useCase.createUseCase(useCaseId);

        vm.prank(participant1);
        vm.expectRevert(UseCaseContract.NotUseCaseOwner.selector);
        useCase.transferUseCaseOwnership(useCaseId, participant2);
    }

    function test_GetParticipantInfo() public {
        vm.startPrank(owner);
        useCase.createUseCase(useCaseId);
        
        address[] memory participants = new address[](1);
        uint96[] memory shares = new uint96[](1);
        participants[0] = participant1;
        shares[0] = 10000;
        useCase.updateRewardShares(useCaseId, participants, shares);
        vm.stopPrank();

        UseCaseContract.Participant memory participantInfo = useCase.getParticipantInfo(useCaseId, participant1);
        assertEq(participantInfo.participant, participant1);
        assertEq(participantInfo.rewardShare, 10000);
    }

    function test_GetMultipleUseCaseInfo() public {
        string[] memory useCaseIds = new string[](2);
        useCaseIds[0] = "UseCase1";
        useCaseIds[1] = "UseCase2";

        vm.startPrank(owner);
        useCase.createUseCase(useCaseIds[0]);
        useCase.createUseCase(useCaseIds[1]);
        vm.stopPrank();

        UseCaseContract.UseCaseInfo[] memory infos = useCase.getMultipleUseCaseInfo(useCaseIds);
        assertEq(infos.length, 2);
        assertEq(infos[0].id, useCaseIds[0]);
        assertEq(infos[1].id, useCaseIds[1]);
    }

    function testDepositRewardsWithPermit() public {
        uint256 amount = 100 ether;
        uint256 deadline = block.timestamp + 1 days;

        // Setup: Transfer tokens to user1 first
        uint256 user1PrivateKey = 2; // Private key for user1
        address user1Address = vm.addr(user1PrivateKey);
        
        vm.prank(owner);
        token.transfer(user1Address, amount);

        // Create use case
        vm.prank(owner);
        useCase.createUseCase(useCaseId);

        // Generate signature for permit
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(
            user1PrivateKey,
            keccak256(
                abi.encodePacked(
                    "\x19\x01",
                    token.DOMAIN_SEPARATOR(),
                    keccak256(
                        abi.encode(
                            token.PERMIT_TYPEHASH(),
                            user1Address,
                            address(useCase),
                            amount,
                            token.nonces(user1Address),
                            deadline
                        )
                    )
                )
            )
        );

        // Call depositRewardsWithPermit
        useCase.depositRewardsWithPermit(
            useCaseId,
            user1Address,
            amount,
            deadline,
            v, r, s
        );

        UseCaseContract.UseCaseInfo memory info = useCase.getUseCaseInfo(useCaseId);
        assertEq(info.totalRewardPool, amount, "Reward pool should have received the tokens");
        assertEq(token.balanceOf(user1Address), 0, "User wallet should have zero balance");
        assertEq(token.balanceOf(address(useCase)), amount, "UseCase contract should have the tokens");
    }
    
    function testRewardDistribution() public {
        string memory testId = "test";
        uint256 rewardPool = 1000 ether;
        
        // Setup use case and fund test contract
        vm.startPrank(owner);
        token.transfer(address(this), rewardPool);
        vm.stopPrank();
        
        // Create and setup use case
        useCase.createUseCase(testId);
        
        address[] memory participants = new address[](2);
        participants[0] = address(1);
        participants[1] = address(2);
        
        uint96[] memory shares = new uint96[](2);
        shares[0] = 6000; // 60%
        shares[1] = 4000; // 40%
        
        // Update shares first
        useCase.updateRewardShares(testId, participants, shares);
        
        // Then deposit rewards
        token.approve(address(useCase), rewardPool);
        useCase.depositRewards(testId, rewardPool);
        
        // Lock rewards
        useCase.lockRewards(testId, 1 days);
        
        // Advance time
        vm.warp(block.timestamp + 1 days + 1);
        
        // Claim as both participants
        vm.prank(address(1));
        useCase.claimRewards(testId);
        
        vm.prank(address(2));
        useCase.claimRewards(testId);
        
        assertEq(token.balanceOf(address(1)), 600 ether);
        assertEq(token.balanceOf(address(2)), 400 ether);
    }
}