// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract PTXToken is ERC20 {
    constructor(uint256 initialSupply) ERC20("PTXToken", "PTX") {
        _mint(msg.sender, initialSupply * (10 ** decimals()));
    }
}
