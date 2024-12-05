import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { UseCaseFactory, PTXToken, UseCaseContract } from "../typechain-types";
import { ContractTransactionReceipt } from "ethers";

describe("UseCaseFactory Integration Tests", function () {
  let factory: UseCaseFactory;
  let token: PTXToken;
  let owner: SignerWithAddress;
  let operator: SignerWithAddress;
  let user: SignerWithAddress;
  let notifier: SignerWithAddress;

  const INITIAL_SUPPLY = ethers.parseEther("1000000");
  const REWARD_POOL = ethers.parseEther("1000");

  // Sample use case configuration
  const sampleUseCase = {
    lockDuration: BigInt(24 * 60 * 60), // 1 day
    eventNames: ["DataProvided", "QualityVerified"],
    baseRewards: [ethers.parseEther("100"), ethers.parseEther("50")],
  };

  beforeEach(async function () {
    [owner, operator, user, notifier] = await ethers.getSigners();

    // Deploy PTX Token
    const PTXToken = await ethers.getContractFactory("PTXToken");
    token = await PTXToken.deploy(INITIAL_SUPPLY);

    // Deploy Factory
    const Factory = await ethers.getContractFactory("UseCaseFactory");
    factory = await Factory.deploy(await token.getAddress());

    // Transfer tokens to user for testing
    await token.transfer(user.address, ethers.parseEther("10000"));
  });

  describe("End-to-end Use Case Creation Workflow", function () {
    it("should allow a user to create a use case with proper token approval", async function () {
      // User approves tokens for the factory
      await token
        .connect(user)
        .approve(await factory.getAddress(), REWARD_POOL);

      // Create use case
      const tx = await factory
        .connect(user)
        .createUseCase(
          sampleUseCase.lockDuration,
          sampleUseCase.eventNames,
          sampleUseCase.baseRewards,
          REWARD_POOL
        );

      // Wait for transaction and get receipt for event analysis
      const receipt = (await tx.wait()) as ContractTransactionReceipt;

      // Verify UseCaseCreated event
      const event = receipt.logs.find((log) => {
        try {
          return (
            factory.interface.parseLog(log as any)?.name === "UseCaseCreated"
          );
        } catch {
          return false;
        }
      });
      expect(event).to.not.be.undefined;

      // Parse the event
      const parsedEvent = factory.interface.parseLog(event as any);
      const useCaseId = parsedEvent?.args[0]; // First argument is useCaseId

      // Get use case contract address
      const useCaseAddress = await factory.useCaseContracts(useCaseId);
      expect(useCaseAddress).to.not.equal(ethers.ZeroAddress);

      // Verify use case ownership
      const UseCaseContract = await ethers.getContractFactory(
        "UseCaseContract"
      );
      const useCase = UseCaseContract.attach(useCaseAddress) as UseCaseContract;
      expect(await useCase.owner()).to.equal(user.address);
    });
  });

  describe("Operator and Notifier Management Workflow", function () {
    it("should handle the complete operator and notifier lifecycle", async function () {
      // Add operator
      await factory.addOperator(operator.address);
      expect(await factory.operators(operator.address)).to.be.true;

      // Operator adds global notifier
      await factory.connect(operator).addGlobalNotifier(notifier.address);
      expect(await factory.globalNotifiers(notifier.address)).to.be.true;

      // Create use case
      await token
        .connect(user)
        .approve(await factory.getAddress(), REWARD_POOL);
      await factory
        .connect(user)
        .createUseCase(
          sampleUseCase.lockDuration,
          sampleUseCase.eventNames,
          sampleUseCase.baseRewards,
          REWARD_POOL
        );

      // Verify notifier permissions
      const useCaseId = 0n; // First use case
      expect(await factory.canNotifyEvents(useCaseId, notifier.address)).to.be
        .true;
    });
  });

  describe("Use Case Query and Management", function () {
    it("should track and retrieve use cases by owner", async function () {
      // User creates multiple use cases
      await token
        .connect(user)
        .approve(await factory.getAddress(), REWARD_POOL * 2n);

      await factory
        .connect(user)
        .createUseCase(
          sampleUseCase.lockDuration,
          sampleUseCase.eventNames,
          sampleUseCase.baseRewards,
          REWARD_POOL
        );

      await factory
        .connect(user)
        .createUseCase(
          sampleUseCase.lockDuration,
          sampleUseCase.eventNames,
          sampleUseCase.baseRewards,
          REWARD_POOL
        );

      // Get user's use cases
      const userCases = await factory.getUseCasesByOwner(user.address);
      expect(userCases.length).to.equal(2);
      expect(userCases[0]).to.equal(0n);
      expect(userCases[1]).to.equal(1n);
    });
  });

  describe("Error Handling", function () {
    it("should handle invalid use case creation attempts", async function () {
      // Ensure user has not approved the factory for the reward pool
      await token.connect(user).approve(await factory.getAddress(), 0);

      // Attempt to create use case without approval
      await expect(
        factory
          .connect(user)
          .createUseCase(
            sampleUseCase.lockDuration,
            sampleUseCase.eventNames,
            sampleUseCase.baseRewards,
            REWARD_POOL
          )
      ).to.be.revertedWithCustomError(token, "ERC20InsufficientAllowance");

      // Attempt to create use case with mismatched arrays
      await expect(
        factory
          .connect(user)
          .createUseCase(
            sampleUseCase.lockDuration,
            ["SingleEvent"],
            sampleUseCase.baseRewards,
            REWARD_POOL
          )
      ).to.be.revertedWith("Arrays length mismatch");
    });

    it("should handle invalid operator/notifier management", async function () {
      // Non-owner attempts to add operator
      await expect(factory.connect(user).addOperator(operator.address))
        .to.be.revertedWithCustomError(factory, "OwnableUnauthorizedAccount")
        .withArgs(user.address);

      // Non-operator attempts to add notifier
      await expect(
        factory.connect(user).addGlobalNotifier(notifier.address)
      ).to.be.revertedWith("Not authorized operator");
    });
  });
});
