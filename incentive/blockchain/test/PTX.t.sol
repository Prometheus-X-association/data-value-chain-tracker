// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "forge-std/Test.sol";
import "../src/PTX.sol";

contract PTXTokenTest is Test {
    PTXToken token;
    address user1 = address(0x123);
    address user2 = address(0x456);
    uint256 initialSupply = 1000 * 10 ** 18;

    function setUp() public {
        token = new PTXToken(1000);
    }

    function testInitialSupply() public {
        assertEq(token.totalSupply(), initialSupply);
        assertEq(token.balanceOf(address(this)), initialSupply);
    }

    function testTransfer() public {
        uint256 transferAmount = 100 * 10**18;

        // Transfer tokens from deployer to user1
        token.transfer(user1, transferAmount);
        assertEq(token.balanceOf(user1), transferAmount);
        assertEq(token.balanceOf(address(this)), initialSupply - transferAmount);
    }
}
