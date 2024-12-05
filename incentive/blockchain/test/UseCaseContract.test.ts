import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { UseCaseContract, UseCaseFactory, PTXToken } from "../typechain-types";
import { ContractTransactionReceipt } from "ethers";

describe("UseCaseContract Integration Tests", function () {
  let factory: UseCaseFactory;
  let useCase: UseCaseContract;
  let token: PTXToken;
  let owner: SignerWithAddress;
  let user: SignerWithAddress;
  let notifier: SignerWithAddress;
  let participant: SignerWithAddress;

  const INITIAL_SUPPLY = ethers.parseEther("1000000");
  const REWARD_POOL = ethers.parseEther("1000");
  const LOCK_DURATION = 24 * 60 * 60; // 1 day

  const eventNames = ["DataProvided", "QualityVerified"];
  const baseRewards = [ethers.parseEther("100"), ethers.parseEther("50")];

  beforeEach(async function () {
    [owner, user, notifier, participant] = await ethers.getSigners();

    // Deploy PTX Token
    const PTXToken = await ethers.getContractFactory("PTXToken");
    token = await PTXToken.deploy(INITIAL_SUPPLY);

    // Deploy Factory
    const Factory = await ethers.getContractFactory("UseCaseFactory");
    factory = await Factory.deploy(await token.getAddress());

    // Transfer tokens to user and approve factory
    await token.transfer(user.address, ethers.parseEther("10000"));
    await token.connect(user).approve(await factory.getAddress(), REWARD_POOL);

    // Create use case
    const tx = await factory
      .connect(user)
      .createUseCase(LOCK_DURATION, eventNames, baseRewards, REWARD_POOL);
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

    // Get use case contract
    const useCaseAddress = await factory.useCaseContracts(useCaseId);
    const UseCaseContract = await ethers.getContractFactory("UseCaseContract");
    useCase = UseCaseContract.attach(useCaseAddress) as UseCaseContract;
  });

  it("should allow event notification and reward allocation", async function () {
    // Add notifier
    await factory.addGlobalNotifier(notifier.address);

    // Notify event
    await useCase
      .connect(notifier)
      .notifyEvent(
        eventNames[0],
        participant.address,
        ethers.parseEther("0.8")
      );

    // Check reward allocation
    const reward = await useCase.participantRewards(participant.address, 0);
    const expectedReward = (baseRewards[0] * 8n) / 10n; // 80% of base reward
    expect(reward.amount).to.equal(expectedReward);
  });

  it("should allow participants to claim rewards after lock duration", async function () {
    // Add notifier and notify event
    await factory.addGlobalNotifier(notifier.address);
    await useCase
      .connect(notifier)
      .notifyEvent(
        eventNames[0],
        participant.address,
        ethers.parseEther("0.8")
      );

    // Warp time to after lock duration
    await ethers.provider.send("evm_increaseTime", [LOCK_DURATION + 1]);
    await ethers.provider.send("evm_mine", []);

    // Transfer tokens to use case contract to cover rewards
    await token.transfer(
      await useCase.getAddress(),
      (baseRewards[0] * 8n) / 10n
    );

    // Participant claims rewards
    await useCase.connect(participant).claimRewards();

    // Verify participant received the tokens
    const balance = await token.balanceOf(participant.address);
    expect(balance).to.equal((baseRewards[0] * 8n) / 10n);
  });

  it("should revert reward claim if too early", async function () {
    // Add notifier and notify event
    await factory.addGlobalNotifier(notifier.address);
    await useCase
      .connect(notifier)
      .notifyEvent(
        eventNames[0],
        participant.address,
        ethers.parseEther("0.8")
      );

    // Attempt to claim rewards too early
    await expect(
      useCase.connect(participant).claimRewards()
    ).to.be.revertedWith("No claimable rewards");
  });

  it("should allow owner to reject rewards", async function () {
    // Add notifier and notify event
    await factory.addGlobalNotifier(notifier.address);
    await useCase
      .connect(notifier)
      .notifyEvent(
        eventNames[0],
        participant.address,
        ethers.parseEther("0.8")
      );

    // Owner rejects reward
    await useCase.connect(user).rejectReward(participant.address, 0);

    // Verify reward was rejected
    const reward = await useCase.participantRewards(participant.address, 0);
    expect(reward.rejected).to.be.true;
  });
});
