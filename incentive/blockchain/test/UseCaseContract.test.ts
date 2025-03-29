import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { UseCaseContract, PTXToken } from "../typechain-types";

describe("UseCaseContract Integration Tests", function () {
  let useCase: UseCaseContract;
  let token: PTXToken;
  let owner: SignerWithAddress;
  let user: SignerWithAddress;
  let notifier: SignerWithAddress;
  let participant: SignerWithAddress;

  const INITIAL_SUPPLY = ethers.parseEther("1000000");
  const REWARD_POOL = ethers.parseEther("1000");
  const LOCK_DURATION = 24 * 60 * 60; // 1 day
  const USE_CASE_ID = "test-use-case-1";

  beforeEach(async function () {
    [owner, user, notifier, participant] = await ethers.getSigners();

    // Deploy PTX Token
    const PTXToken = await ethers.getContractFactory("PTXToken");
    token = await PTXToken.deploy(INITIAL_SUPPLY);

    // Deploy UseCase Contract
    const UseCaseContract = await ethers.getContractFactory("UseCaseContract");
    useCase = await UseCaseContract.deploy(await token.getAddress());

    // Transfer tokens to user for testing
    await token.transfer(user.address, ethers.parseEther("10000"));
    await token.connect(user).approve(await useCase.getAddress(), REWARD_POOL);

    // Create use case
    await useCase.connect(user).createUseCase(USE_CASE_ID);
  });

  it("should allow reward deposits and updates", async function () {
    await useCase.connect(user).depositRewards(USE_CASE_ID, REWARD_POOL);

    const participants = [participant.address];
    const shares = [8000]; // 80% in basis points (100% = 10000)
    await useCase
      .connect(user)
      .updateRewardShares(USE_CASE_ID, participants, shares);

    const useCaseInfo = await useCase.getUseCaseInfo(USE_CASE_ID);
    expect(useCaseInfo.totalRewardPool).to.equal(REWARD_POOL);
    expect(useCaseInfo.participants[0].participant).to.equal(
      participant.address
    );
    expect(useCaseInfo.participants[0].rewardShare).to.equal(shares[0]);
  });

  it("should allow participants to claim rewards after lock duration", async function () {
    // Setup rewards
    await useCase.connect(user).depositRewards(USE_CASE_ID, REWARD_POOL);
    const participants = [participant.address];
    const shares = [10000]; // 100% in basis points
    await useCase
      .connect(user)
      .updateRewardShares(USE_CASE_ID, participants, shares);

    // Lock rewards
    await useCase.connect(user).lockRewards(USE_CASE_ID, LOCK_DURATION);

    // Warp time to after lock duration
    await ethers.provider.send("evm_increaseTime", [LOCK_DURATION + 1]);
    await ethers.provider.send("evm_mine", []);

    // Participant claims rewards
    await useCase.connect(participant).claimRewards(USE_CASE_ID);

    // Verify participant received the tokens
    const balance = await token.balanceOf(participant.address);
    expect(balance).to.equal(REWARD_POOL);
  });

  it("should revert reward claim if too early", async function () {
    // Setup rewards
    await useCase.connect(user).depositRewards(USE_CASE_ID, REWARD_POOL);
    const participants = [participant.address];
    const shares = [10000]; // 100% in basis points
    await useCase
      .connect(user)
      .updateRewardShares(USE_CASE_ID, participants, shares);
    await useCase.connect(user).lockRewards(USE_CASE_ID, LOCK_DURATION);

    // Attempt to claim rewards too early
    await expect(
      useCase.connect(participant).claimRewards(USE_CASE_ID)
    ).to.be.revertedWithCustomError(useCase, "LockupPeriodNotEnded");
  });
});
