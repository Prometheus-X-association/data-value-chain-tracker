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
        uint256 amount = 100 ether;
        bytes32 incentiveType = keccak256("TestIncentive");

        vm.startPrank(owner);
        token.approve(address(this), amount);
        vm.stopPrank();

        token.transferReward(owner, user1, amount, incentiveType);

        assertEq(token.balanceOf(user1), amount, "User1 should receive the reward");
        assertEq(token.balanceOf(owner), initialSupply - amount, "Owner balance should decrease");
    }

    function testTransferRewardWithZeroAddress() public {
        uint256 amount = 100 ether;
        bytes32 incentiveType = keccak256("TestIncentive");

        vm.expectRevert(PTXToken.ZeroAddress.selector);
        token.transferReward(address(0), user1, amount, incentiveType);

        vm.expectRevert(PTXToken.ZeroAddress.selector);
        token.transferReward(owner, address(0), amount, incentiveType);
    }

    function testTransferRewardWithZeroAmount() public {
        bytes32 incentiveType = keccak256("TestIncentive");

        vm.expectRevert(PTXToken.ZeroAmount.selector);
        token.transferReward(owner, user1, 0, incentiveType);
    }

    function testTransferRewardWithInsufficientAllowance() public {
        uint256 amount = 100 ether;
        bytes32 incentiveType = keccak256("TestIncentive");

        vm.startPrank(owner);
        token.approve(address(this), amount - 1 ether);
        vm.stopPrank();

        vm.expectRevert();
        token.transferReward(owner, user1, amount, incentiveType);
    }
  
    function testTransferRewardWithPermit() public {
        uint256 amount = 100 ether;
        bytes32 incentiveType = keccak256("TestIncentive");
        uint256 deadline = block.timestamp + 1 days;

        // Setup: Transfer tokens to user1 first
        uint256 user1PrivateKey = 2; // Private key for user1
        address user1Address = vm.addr(user1PrivateKey);
        
        vm.prank(owner);
        token.transfer(user1Address, amount);

        // Generate signature for permit
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(
            user1PrivateKey, // Use user1's private key
            keccak256(
                abi.encodePacked(
                    "\x19\x01",
                    token.DOMAIN_SEPARATOR(),
                    keccak256(
                        abi.encode(
                            token.PERMIT_TYPEHASH(),
                            user1Address,
                            address(this),
                            amount,
                            token.nonces(user1Address),
                            deadline
                        )
                    )
                )
            )
        );

        // Call transferRewardWithPermit
        token.transferRewardWithPermit(user1Address, address(this), owner, amount, deadline, v, r, s, incentiveType);

        // Assertions
        assertEq(token.balanceOf(user1Address), 0, "User1 balance should be zero");
        assertEq(token.balanceOf(owner), initialSupply - amount + amount, "Owner should receive the tokens");
        assertEq(token.allowance(user1Address, address(this)), 0, "Allowance should be fully used");
    }


    function testTransferRewardWithExpiredPermit() public {
        uint256 amount = 100 ether;
        bytes32 incentiveType = keccak256("TestIncentive");
        uint256 deadline = block.timestamp - 1; // Expired deadline

        (uint8 v, bytes32 r, bytes32 s) = vm.sign(
            1,
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

        vm.expectRevert();
        token.transferRewardWithPermit(owner, address(this), user1, amount, deadline, v, r, s, incentiveType);
    }

    function testTransferRewardWithInvalidSignature() public {
        uint256 amount = 100 ether;
        bytes32 incentiveType = keccak256("TestIncentive");
        uint256 deadline = block.timestamp + 1 days;

        (uint8 v, bytes32 r, bytes32 s) = vm.sign(
            2, // Wrong private key
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

        vm.expectRevert();
        token.transferRewardWithPermit(owner, address(this), user1, amount, deadline, v, r, s, incentiveType);
    }

    function testVersion() public {
        string memory version = token.version();
        assertEq(version, "1.0.0", "Version should be 1.0.0");
    }

    function testDefaultAdminRole() public {
        bytes32 defaultAdminRole = 0x00;
        assertTrue(token.hasRole(defaultAdminRole, owner), "Owner should have default admin role");
        assertFalse(token.hasRole(defaultAdminRole, user1), "User1 should not have default admin role");
    }
}
