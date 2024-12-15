// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "../src/PTXToken.sol";

contract PTXTokenTest is Test {
    PTXToken public token;
    address public owner;
    address public user1;
    address public user2;
    uint256 public initialSupply = 1_000_000 ether; // 1,000,000 tokens

    function setUp() public {
        owner = vm.addr(1);
        user1 = vm.addr(2);
        user2 = vm.addr(3);

        vm.startPrank(owner);
        token = new PTXToken(initialSupply);
        vm.stopPrank();
    }

    function testInitialSupply() public {
        uint256 balance = token.balanceOf(owner);
        assertEq(balance, initialSupply, "Owner should have the initial supply");
    }

    function testTransferReward() public {
        uint256 amount = 100 ether; // Transfer 100 tokens
        bytes32 incentiveType = keccak256("TestIncentive");

        vm.startPrank(owner);
        token.approve(address(this), amount);
        vm.stopPrank();

        // Perform transferReward
        token.transferReward(owner, user1, amount, incentiveType);

        // Assertions
        assertEq(token.balanceOf(user1), amount, "User1 should receive the reward");
        assertEq(token.balanceOf(owner), initialSupply - amount, "Owner balance should decrease by the reward amount");
    }

    function testTransferRewardWithInsufficientAllowance() public {
        uint256 amount = 100 ether;
        bytes32 incentiveType = keccak256("TestIncentive");

        vm.startPrank(owner);
        // Not approving enough allowance
        token.approve(address(this), amount - 1 ether);
        vm.stopPrank();

        vm.expectRevert();
        token.transferReward(owner, user1, amount, incentiveType);
    }

    function testTransferRewardWithPermit() public {
        uint256 amount = 100 ether;
        bytes32 incentiveType = keccak256("TestIncentive");
        uint256 deadline = block.timestamp + 1 days;

        // Generate signature for permit
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(
            1, // Owner's private key index
            keccak256(
                abi.encodePacked(
                    "\x19\x01",
                    token.DOMAIN_SEPARATOR(),
                    keccak256(
                        abi.encode(
                            token.PERMIT_TYPEHASH(),
                            owner,
                            address(this),
                            amount,
                            token.nonces(owner),
                            deadline
                        )
                    )
                )
            )
        );

        // Call transferRewardWithPermit from external user
        vm.prank(user1);
        token.transferRewardWithPermit(owner, address(this), amount, deadline, v, r, s, incentiveType);

        // Assertions
        assertEq(token.balanceOf(address(this)), amount, "Contract should receive the reward");
        assertEq(token.balanceOf(owner), initialSupply - amount, "Owner balance should decrease by the reward amount");
    }

    function testVersion() public {
        string memory version = token.version();
        assertEq(version, "1.0.0", "Version should be 1.0.0");
    }
}
