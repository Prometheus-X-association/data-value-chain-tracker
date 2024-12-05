// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {Test, console2} from "forge-std/Test.sol";
import {PTXToken} from "../src/PTX.sol";
import {IERC20Errors} from "@openzeppelin/contracts/interfaces/draft-IERC6093.sol";

contract PTXTokenTest is Test {
    PTXToken public token;
    address public owner;
    address public user1;
    address public user2;
    uint256 public constant INITIAL_SUPPLY = 1_000_000;
    
    event RewardTransfer(
        address indexed from,
        address indexed to,
        uint256 amount,
        bytes32 indexed useCaseId
    );

    function setUp() public {
        owner = makeAddr("owner");
        user1 = makeAddr("user1");
        user2 = makeAddr("user2");

        vm.prank(owner);
        token = new PTXToken(INITIAL_SUPPLY);
    }

    function test_InitialState() public {
        assertEq(token.name(), "PTXToken");
        assertEq(token.symbol(), "PTX");
        assertEq(token.decimals(), 18);
        assertEq(token.totalSupply(), INITIAL_SUPPLY * 10**18);
        assertEq(token.balanceOf(owner), INITIAL_SUPPLY * 10**18);
        assertEq(token.owner(), owner);
    }

    function test_Version() public {
        assertEq(token.version(), "1.0.0");
    }

    function test_Transfer() public {
        uint256 amount = 100 * 10**18;
        
        vm.prank(owner);
        bool success = token.transfer(user1, amount);

        assertTrue(success);
        assertEq(token.balanceOf(user1), amount);
        assertEq(token.balanceOf(owner), (INITIAL_SUPPLY * 10**18) - amount);
    }

    function test_TransferReward() public {
        uint256 amount = 100 * 10**18;
        bytes32 useCaseId = bytes32(uint256(1));

        vm.prank(owner);
        bool success = token.transferReward(user1, amount, useCaseId);

        assertTrue(success);
        assertEq(token.balanceOf(user1), amount);
        assertEq(token.balanceOf(owner), (INITIAL_SUPPLY * 10**18) - amount);
    }

    function test_TransferReward_EmitsEvent() public {
        uint256 amount = 100 * 10**18;
        bytes32 useCaseId = bytes32(uint256(1));

        vm.prank(owner);
        vm.expectEmit(true, true, false, true);
        emit RewardTransfer(owner, user1, amount, useCaseId);
        token.transferReward(user1, amount, useCaseId);
    }

    function test_TransferReward_RevertIfInsufficientBalance() public {
        uint256 amount = (INITIAL_SUPPLY + 1) * 10**18;
        bytes32 useCaseId = bytes32(uint256(1));

        vm.prank(owner);
        vm.expectRevert(
            abi.encodeWithSelector(IERC20Errors.ERC20InsufficientBalance.selector, owner, INITIAL_SUPPLY * 10**18, amount)
        );
        token.transferReward(user1, amount, useCaseId);
    }

    function test_Approve() public {
        uint256 amount = 100 * 10**18;
        
        vm.prank(owner);
        bool success = token.approve(user1, amount);

        assertTrue(success);
        assertEq(token.allowance(owner, user1), amount);
    }

    function test_TransferFrom() public {
        uint256 amount = 100 * 10**18;
        
        vm.prank(owner);
        token.approve(user1, amount);

        vm.prank(user1);
        bool success = token.transferFrom(owner, user2, amount);

        assertTrue(success);
        assertEq(token.balanceOf(user2), amount);
        assertEq(token.balanceOf(owner), (INITIAL_SUPPLY * 10**18) - amount);
        assertEq(token.allowance(owner, user1), 0);
    }

    function test_TransferFrom_RevertIfNotApproved() public {
        uint256 amount = 100 * 10**18;
        
        vm.prank(user1);
        vm.expectRevert(
            abi.encodeWithSelector(IERC20Errors.ERC20InsufficientAllowance.selector, user1, 0, amount)
        );
        token.transferFrom(owner, user2, amount);
    }

    function test_TransferOwnership() public {
        vm.prank(owner);
        token.transferOwnership(user1);

        assertEq(token.owner(), user1);
    }

    function test_TransferOwnership_RevertIfNotOwner() public {
        vm.prank(user1);
        vm.expectRevert(
            abi.encodeWithSignature("OwnableUnauthorizedAccount(address)", user1)
        );
        token.transferOwnership(user2);
    }

    function testFuzz_Transfer(uint256 amount) public {
        // Bound the amount to be within the total supply
        amount = bound(amount, 0, INITIAL_SUPPLY * 10**18);
        
        vm.prank(owner);
        bool success = token.transfer(user1, amount);

        assertTrue(success);
        assertEq(token.balanceOf(user1), amount);
        assertEq(token.balanceOf(owner), (INITIAL_SUPPLY * 10**18) - amount);
    }

    function testFuzz_TransferReward(uint256 amount, bytes32 useCaseId) public {
        // Bound the amount to be within the total supply
        amount = bound(amount, 0, INITIAL_SUPPLY * 10**18);
        
        vm.prank(owner);
        bool success = token.transferReward(user1, amount, useCaseId);

        assertTrue(success);
        assertEq(token.balanceOf(user1), amount);
        assertEq(token.balanceOf(owner), (INITIAL_SUPPLY * 10**18) - amount);
    }
}
