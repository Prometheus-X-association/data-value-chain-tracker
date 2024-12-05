// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {Test, console2} from "forge-std/Test.sol";
import {UseCaseFactory} from "../src/UseCaseFactory.sol";
import {UseCaseContract} from "../src/UseCaseContract.sol";
import {PTXToken} from "../src/PTX.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract UseCaseFactoryTest is Test {
    uint256 public constant INITIAL_SUPPLY = 1_000_000;
    uint256 public constant REWARD_POOL = 1_000;

    UseCaseFactory public factory;
    PTXToken public token;
    
    address public owner;
    address public operator;
    address public notifier;
    address public user;

    event OperatorAdded(address indexed operator);
    event OperatorRemoved(address indexed operator);
    event GlobalNotifierAdded(address indexed notifier, address indexed addedBy);
    event UseCaseCreated(
        uint256 indexed useCaseId, 
        address contractAddress,
        string[] eventNames,
        uint256[] baseRewards
    );

    function setUp() public {
        owner = makeAddr("owner");
        operator = makeAddr("operator");
        notifier = makeAddr("notifier");
        user = makeAddr("user");

        vm.startPrank(owner);
        token = new PTXToken(INITIAL_SUPPLY);
        factory = new UseCaseFactory(address(token));
        
        // Transfer tokens to user but keep some for other tests
        token.transfer(user, INITIAL_SUPPLY * 10**18 / 2); // Transfer only half to user
        vm.stopPrank();

        // User approves factory
        vm.startPrank(user);
        token.approve(address(factory), type(uint256).max);
        vm.stopPrank();
    }

    function test_InitialState() public {
        assertEq(factory.owner(), owner);
        assertEq(factory.incentiveToken(), address(token));
        assertEq(factory.nextUseCaseId(), 0);
        assertTrue(factory.operators(owner));
    }

    function test_AddOperator() public {
        vm.prank(owner);
        factory.addOperator(operator);
        
        assertTrue(factory.operators(operator));
    }

    function test_AddOperator_RevertIfNotOwner() public {
        vm.prank(user);
        vm.expectRevert(
            abi.encodeWithSignature("OwnableUnauthorizedAccount(address)", user)
        );
        factory.addOperator(operator);
    }

    function test_AddOperator_RevertIfZeroAddress() public {
        vm.prank(owner);
        vm.expectRevert("Invalid address");
        factory.addOperator(address(0));
    }

    function test_AddOperator_RevertIfAlreadyOperator() public {
        vm.startPrank(owner);
        factory.addOperator(operator);
        
        vm.expectRevert("Already an operator");
        factory.addOperator(operator);
        vm.stopPrank();
    }

    function test_RemoveOperator() public {
        vm.startPrank(owner);
        factory.addOperator(operator);
        factory.removeOperator(operator);
        vm.stopPrank();

        assertFalse(factory.operators(operator));
    }

    function test_RemoveOperator_RevertIfNotOperator() public {
        vm.prank(owner);
        vm.expectRevert("Not an operator");
        factory.removeOperator(operator);
    }

    function test_RemoveOperator_RevertIfOwner() public {
        vm.prank(owner);
        vm.expectRevert("Cannot remove owner as operator");
        factory.removeOperator(owner);
    }

    function test_AddGlobalNotifier() public {
        vm.prank(owner);
        factory.addGlobalNotifier(notifier);

        assertTrue(factory.globalNotifiers(notifier));
    }

    function test_AddGlobalNotifier_RevertIfNotOperator() public {
        vm.prank(user);
        vm.expectRevert("Not authorized operator");
        factory.addGlobalNotifier(notifier);
    }

    function test_CreateUseCase() public {
        string[] memory eventNames = new string[](2);
        eventNames[0] = "Event1";
        eventNames[1] = "Event2";

        uint256[] memory baseRewards = new uint256[](2);
        baseRewards[0] = 100 * 10**18;
        baseRewards[1] = 200 * 10**18;

        uint256 initialRewardPool = REWARD_POOL * 10**18;

        // User approves factory for the initial reward pool
        vm.startPrank(user);
        token.approve(address(factory), initialRewardPool);
        uint256 useCaseId = factory.createUseCase(
            1 days,
            eventNames,
            baseRewards,
            initialRewardPool  // Pass the initial reward pool
        );
        vm.stopPrank();

        assertEq(useCaseId, 0);
        assertEq(factory.nextUseCaseId(), 1);
        address useCaseAddr = factory.useCaseContracts(useCaseId);
        assertTrue(useCaseAddr != address(0));

        assertEq(UseCaseContract(useCaseAddr).remainingRewardPool(), initialRewardPool);
    }

    function test_CreateUseCase_RevertIfNoEvents() public {
        string[] memory eventNames = new string[](0);
        uint256[] memory baseRewards = new uint256[](0);

        vm.prank(user);
        vm.expectRevert("No events specified");
        factory.createUseCase(1 days, eventNames, baseRewards, REWARD_POOL * 10**18);
    }

    function test_CreateUseCase_RevertIfArrayMismatch() public {
        string[] memory eventNames = new string[](2);
        eventNames[0] = "Event1";
        eventNames[1] = "Event2";

        uint256[] memory baseRewards = new uint256[](1);
        baseRewards[0] = 100 * 10**18;

        vm.prank(user);
        vm.expectRevert("Arrays length mismatch");
        factory.createUseCase(1 days, eventNames, baseRewards, REWARD_POOL * 10**18);
    }

    function test_GetUseCasesByOwner() public {
        string[] memory eventNames = new string[](1);
        eventNames[0] = "Event1";
        uint256[] memory baseRewards = new uint256[](1);
        baseRewards[0] = 100 * 10**18;

        // Ensure operator has tokens and approves factory
        vm.startPrank(owner);
        token.transfer(operator, REWARD_POOL * 10**18 * 3);
        vm.stopPrank();

        vm.startPrank(operator);
        token.approve(address(factory), type(uint256).max);
        vm.stopPrank();

        vm.startPrank(user);
        factory.createUseCase(1 days, eventNames, baseRewards, REWARD_POOL * 10**18);
        factory.createUseCase(1 days, eventNames, baseRewards, REWARD_POOL * 10**18);
        vm.stopPrank();

        vm.prank(operator);
        factory.createUseCase(1 days, eventNames, baseRewards, REWARD_POOL * 10**18);

        uint256[] memory userCases = factory.getUseCasesByOwner(user);
        assertEq(userCases.length, 2);
        assertEq(userCases[0], 0);
        assertEq(userCases[1], 1);
    }

    function test_CreateUseCase_TokenTransfer() public {
        // Setup event configuration
        string[] memory eventNames = new string[](1);
        eventNames[0] = "Event1";
        uint256[] memory baseRewards = new uint256[](1);
        baseRewards[0] = 100 * 10**18;
        
        uint256 initialRewardPool = REWARD_POOL * 10**18;
        
        // Record initial balances
        uint256 userInitialBalance = token.balanceOf(user);
        
        // Create use case
        vm.startPrank(user);
        uint256 useCaseId = factory.createUseCase(
            1 days,
            eventNames,
            baseRewards,
            initialRewardPool
        );
        vm.stopPrank();
        
        // Get use case contract address
        address useCaseAddr = factory.useCaseContracts(useCaseId);
        
        // Verify token transfers
        assertEq(token.balanceOf(useCaseAddr), initialRewardPool, "Use case should receive reward pool");
        assertEq(
            token.balanceOf(user), 
            userInitialBalance - initialRewardPool, 
            "User balance should decrease by reward pool amount"
        );
    }

    function test_CreateUseCase_RevertOnInsufficientAllowance() public {
        string[] memory eventNames = new string[](1);
        eventNames[0] = "Event1";
        uint256[] memory baseRewards = new uint256[](1);
        baseRewards[0] = 100 * 10**18;
        
        uint256 initialRewardPool = REWARD_POOL * 10**18;
        
        // Revoke approval
        vm.startPrank(user);
        token.approve(address(factory), 0);
        
        // Attempt to create use case without approval
        vm.expectRevert(
            abi.encodeWithSignature(
                "ERC20InsufficientAllowance(address,uint256,uint256)",
                address(factory),
                0,
                initialRewardPool
            )
        );
        factory.createUseCase(
            1 days,
            eventNames,
            baseRewards,
            initialRewardPool
        );
        vm.stopPrank();
    }
}