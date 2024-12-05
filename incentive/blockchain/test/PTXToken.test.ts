import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { PTXToken } from "../typechain-types";

describe("PTXToken Integration Tests", function () {
  let token: PTXToken;
  let owner: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;
  let useCase: SignerWithAddress;

  const INITIAL_SUPPLY = 1_000_000n;
  const TRANSFER_AMOUNT = 1_000n;

  beforeEach(async function () {
    [owner, user1, user2, useCase] = await ethers.getSigners();

    // Deploy PTX Token
    const PTXToken = await ethers.getContractFactory("PTXToken");
    token = await PTXToken.deploy(INITIAL_SUPPLY);
  });

  describe("Basic Token Functionality", function () {
    it("should have correct initial supply", async function () {
      const expectedSupply = INITIAL_SUPPLY * 10n ** 18n;
      expect(await token.totalSupply()).to.equal(expectedSupply);
      expect(await token.balanceOf(owner.address)).to.equal(expectedSupply);
    });

    it("should allow transfers between accounts", async function () {
      await token.transfer(user1.address, TRANSFER_AMOUNT);
      expect(await token.balanceOf(user1.address)).to.equal(TRANSFER_AMOUNT);

      await token.connect(user1).transfer(user2.address, TRANSFER_AMOUNT / 2n);
      expect(await token.balanceOf(user2.address)).to.equal(
        TRANSFER_AMOUNT / 2n
      );
    });

    it("should handle approvals and transferFrom", async function () {
      await token.approve(user1.address, TRANSFER_AMOUNT);
      expect(await token.allowance(owner.address, user1.address)).to.equal(
        TRANSFER_AMOUNT
      );

      await token
        .connect(user1)
        .transferFrom(owner.address, user2.address, TRANSFER_AMOUNT);
      expect(await token.balanceOf(user2.address)).to.equal(TRANSFER_AMOUNT);
    });
  });

  describe("Use Case Reward Functionality", function () {
    it("should allow use case to transfer rewards", async function () {
      // Transfer tokens to use case contract
      await token.transfer(useCase.address, TRANSFER_AMOUNT);

      // Mock use case transferring rewards
      await token
        .connect(useCase)
        .transferReward(
          user1.address,
          TRANSFER_AMOUNT / 2n,
          ethers.encodeBytes32String("useCaseId")
        );

      expect(await token.balanceOf(user1.address)).to.equal(
        TRANSFER_AMOUNT / 2n
      );
    });

    it("should emit RewardTransfer event", async function () {
      await token.transfer(useCase.address, TRANSFER_AMOUNT);

      const useCaseId = ethers.encodeBytes32String("useCaseId");
      await expect(
        token
          .connect(useCase)
          .transferReward(user1.address, TRANSFER_AMOUNT, useCaseId)
      )
        .to.emit(token, "RewardTransfer")
        .withArgs(useCase.address, user1.address, TRANSFER_AMOUNT, useCaseId);
    });
  });

  describe("Error Handling", function () {
    it("should revert on insufficient balance", async function () {
      const excessAmount = INITIAL_SUPPLY * 10n ** 18n + 1n;
      await expect(
        token.transfer(user1.address, excessAmount)
      ).to.be.revertedWithCustomError(token, "ERC20InsufficientBalance");
    });

    it("should revert on insufficient allowance", async function () {
      await token.approve(user1.address, TRANSFER_AMOUNT);
      const excessAmount = TRANSFER_AMOUNT + 1n;

      await expect(
        token
          .connect(user1)
          .transferFrom(owner.address, user2.address, excessAmount)
      ).to.be.revertedWithCustomError(token, "ERC20InsufficientAllowance");
    });

    it("should revert on transfer to zero address", async function () {
      await expect(
        token.transfer(ethers.ZeroAddress, TRANSFER_AMOUNT)
      ).to.be.revertedWithCustomError(token, "ERC20InvalidReceiver");
    });
  });

  describe("Token Information", function () {
    it("should have correct name and symbol", async function () {
      expect(await token.name()).to.equal("PTXToken");
      expect(await token.symbol()).to.equal("PTX");
    });

    it("should have 18 decimals", async function () {
      expect(await token.decimals()).to.equal(18);
    });
  });
});
