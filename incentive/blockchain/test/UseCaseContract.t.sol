// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {Test, console2} from "forge-std/Test.sol";
import {UseCaseContract } from "../src/UseCaseContract.sol";
import {PTXToken} from "../src/PTXToken.sol";

contract UseCaseContractTest is Test {
    UseCaseContract public useCase;
    PTXToken public token;

    address public owner;
    address public participant;
    string public useCaseId = "TestUseCase";

    uint256 public constant INITIAL_SUPPLY = 1_000_000;

    function setUp() public {
        owner = makeAddr("owner");
        participant = makeAddr("participant");
        
        vm.startPrank(owner);
        token = new PTXToken(INITIAL_SUPPLY); // This already mints to msg.sender (owner)
        useCase = new UseCaseContract(address(token));
        useCase.grantRole(useCase.DEFAULT_ADMIN_ROLE(), owner);
        
        // Optional: If you need to transfer to another address, do so explicitly
        // token.transfer(someOtherAddress, amount);
        
        vm.stopPrank();
    }

    function test_CreateUseCase() public {
        vm.startPrank(owner);
        useCase.createUseCase(useCaseId);
        vm.stopPrank();

        UseCaseContract.UseCaseInfo memory info = useCase.getUseCaseInfo(useCaseId);
        assertEq(info.id, useCaseId);
        assertEq(info.owner, owner);
    }

    function test_DepositRewards() public {
        vm.startPrank(owner);
        
        uint256 ownerBalance = token.balanceOf(owner);
        console2.log("Owner Balance:", ownerBalance);
        
        useCase.createUseCase(useCaseId);
        
        token.approve(address(useCase), 1000);
        
        useCase.depositRewards(useCaseId, 1000);
        
        vm.stopPrank();
        
        UseCaseContract.UseCaseInfo memory useCaseInfo = useCase.getUseCaseInfo(useCaseId);
        assertEq(useCaseInfo.rewardPool, 1000, "Reward pool should be updated");
        assertEq(token.balanceOf(address(useCase)), 1000, "Use case contract should receive tokens");
    }

    function test_UpdateRewardShares() public {
        vm.startPrank(owner);
        useCase.createUseCase(useCaseId);
        token.approve(address(useCase), 1000);
        useCase.depositRewards(useCaseId, 1000);
        address[] memory participants = new address[](1);
        uint256[] memory shares = new uint256[](1);
        participants[0] = participant;
        shares[0] = 10000; // 100%

        useCase.updateRewardShares(useCaseId, participants, shares);
        vm.stopPrank();

        UseCaseContract.UseCaseInfo memory info = useCase.getUseCaseInfo(useCaseId);
        assertEq(info.totalShares, 10000);
    }

    function test_LockRewards() public {
        vm.startPrank(owner);
        useCase.createUseCase(useCaseId);
        token.approve(address(useCase), 1000);
        useCase.depositRewards(useCaseId, 1000);
        address[] memory participants = new address[](1);
        uint256[] memory shares = new uint256[](1);
        participants[0] = participant;
        shares[0] = 10000; // 100%

        useCase.updateRewardShares(useCaseId, participants, shares);
        useCase.lockRewards(useCaseId, 1 days);
        vm.stopPrank();

        UseCaseContract.UseCaseInfo memory info = useCase.getUseCaseInfo(useCaseId);
        assertEq(info.lockupPeriod, 1 days);
        assertTrue(info.rewardsLocked);
    }

    function test_ClaimRewards() public {
        vm.startPrank(owner);
        useCase.createUseCase(useCaseId);
        token.approve(address(useCase), 1000);
        useCase.depositRewards(useCaseId, 1000);
        address[] memory participants = new address[](1);
        uint256[] memory shares = new uint256[](1);
        participants[0] = participant;
        shares[0] = 10000; // 100%

        useCase.updateRewardShares(useCaseId, participants, shares);
        useCase.lockRewards(useCaseId, 1 days);
        vm.stopPrank();

        // Simulate time passing
        vm.warp(block.timestamp + 1 days + 1);
        vm.startPrank(participant);
        useCase.claimRewards(useCaseId);
        vm.stopPrank();

        assertEq(token.balanceOf(participant), 1000); // Participant should receive the full reward
    }

    function test_ClaimRewards_RevertIfNotLocked() public {
        vm.startPrank(owner);
        useCase.createUseCase(useCaseId);
        token.approve(address(useCase), 1000);
        useCase.depositRewards(useCaseId, 1000);
        address[] memory participants = new address[](1);
        uint256[] memory shares = new uint256[](1);
        participants[0] = participant;
        shares[0] = 10000; // 100%

        useCase.updateRewardShares(useCaseId, participants, shares);
        vm.stopPrank();

        vm.startPrank(participant);
        vm.expectRevert("Rewards not locked yet");
        useCase.claimRewards(useCaseId);
        vm.stopPrank();
    }

    function test_ClaimRewards_RevertIfTooEarly() public {
        vm.startPrank(owner);
        useCase.createUseCase(useCaseId);
        token.approve(address(useCase), 1000);
        useCase.depositRewards(useCaseId, 1000);
        address[] memory participants = new address[](1);
        uint256[] memory shares = new uint256[](1);
        participants[0] = participant;
        shares[0] = 10000; // 100%

        useCase.updateRewardShares(useCaseId, participants, shares);
        useCase.lockRewards(useCaseId, 1 days);
        vm.stopPrank();

        vm.startPrank(participant);
        vm.expectRevert("Lockup period not ended");
        useCase.claimRewards(useCaseId);
        vm.stopPrank();
    }
}
