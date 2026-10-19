import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { UseCaseContract, PTXToken } from "../typechain-types";

// Regression tests for the accounting and authorization issues found in the security review.
describe("UseCaseContract security", function () {
  let useCase: UseCaseContract;
  let token: PTXToken;
  let admin: SignerWithAddress;
  let victimOwner: SignerWithAddress;
  let attacker: SignerWithAddress;
  let relayer: SignerWithAddress;
  let participantA: SignerWithAddress;
  let participantB: SignerWithAddress;

  const LOCK = 60;
  const POOL = ethers.parseEther("1000");

  const passLockup = async () => {
    await ethers.provider.send("evm_increaseTime", [LOCK + 1]);
    await ethers.provider.send("evm_mine", []);
  };

  const signPermit = async (signer: SignerWithAddress, spender: string, value: bigint) => {
    const deadline = (await ethers.provider.getBlock("latest"))!.timestamp + 3600;
    const signature = await signer.signTypedData(
      {
        name: "PTXToken",
        version: "1",
        chainId: (await ethers.provider.getNetwork()).chainId,
        verifyingContract: await token.getAddress(),
      },
      {
        Permit: [
          { name: "owner", type: "address" },
          { name: "spender", type: "address" },
          { name: "value", type: "uint256" },
          { name: "nonce", type: "uint256" },
          { name: "deadline", type: "uint256" },
        ],
      },
      { owner: signer.address, spender, value, nonce: await token.nonces(signer.address), deadline },
    );
    const { v, r, s } = ethers.Signature.from(signature);
    return { deadline, v, r, s };
  };

  beforeEach(async function () {
    [admin, victimOwner, attacker, relayer, participantA, participantB] = await ethers.getSigners();

    token = await (await ethers.getContractFactory("PTXToken")).deploy(ethers.parseEther("1000000"));
    useCase = await (await ethers.getContractFactory("UseCaseContract")).deploy(await token.getAddress());
    await useCase.grantRole(await useCase.RELAYER_ROLE(), relayer.address);

    await token.transfer(victimOwner.address, ethers.parseEther("10000"));
    await token.connect(victimOwner).approve(await useCase.getAddress(), ethers.MaxUint256);

    // A funded, legitimate use case whose tokens sit in the shared contract balance.
    await useCase.connect(victimOwner).createUseCase("victim");
    await useCase.connect(victimOwner).depositRewards("victim", POOL);
    await useCase.connect(victimOwner).updateRewardShares("victim", [participantA.address], [10000]);
  });

  it("does not let an unfunded fixed reward drain other use cases", async function () {
    await useCase
      .connect(attacker)
      .createUseCaseWithParticipants("attack", [attacker.address], [1], [POOL]);

    await expect(useCase.connect(attacker).lockRewards("attack", LOCK)).to.be.revertedWithCustomError(
      useCase,
      "FixedRewardsExceedPool",
    );
    expect(await token.balanceOf(await useCase.getAddress())).to.equal(POOL);
  });

  it("pays fixed rewards from the use case's own pool only", async function () {
    await useCase
      .connect(victimOwner)
      .createUseCaseWithParticipants(
        "mixed",
        [participantA.address, participantB.address],
        [1, 1],
        [ethers.parseEther("100"), 0],
      );
    await useCase.connect(victimOwner).depositRewards("mixed", ethers.parseEther("300"));
    await useCase.connect(victimOwner).lockRewards("mixed", LOCK);
    await passLockup();

    await useCase.connect(victimOwner).distribute("mixed");

    // 100 fixed + half of the remaining 200 for A, the other half for B.
    expect(await token.balanceOf(participantA.address)).to.equal(ethers.parseEther("200"));
    expect(await token.balanceOf(participantB.address)).to.equal(ethers.parseEther("100"));
    expect((await useCase.useCases("mixed")).remainingRewardPool).to.equal(0);
    // The other use case's deposit is untouched.
    expect(await token.balanceOf(await useCase.getAddress())).to.equal(POOL);
  });

  it("rejects permit deposits submitted by anyone but the owner or a relayer", async function () {
    const amount = ethers.parseEther("500");
    const { deadline, v, r, s } = await signPermit(victimOwner, await useCase.getAddress(), amount);
    await useCase.connect(attacker).createUseCase("attack");

    await expect(
      useCase.connect(attacker).depositRewardsWithPermit("attack", victimOwner.address, amount, deadline, v, r, s),
    ).to.be.revertedWithCustomError(useCase, "NotAuthorizedDepositor");

    await useCase
      .connect(relayer)
      .depositRewardsWithPermit("victim", victimOwner.address, amount, deadline, v, r, s);
    expect(await useCase.deposits("victim", victimOwner.address)).to.equal(POOL + amount);
  });

  it("still accepts a permit deposit whose permit was front-run", async function () {
    const amount = ethers.parseEther("10");
    const spender = await useCase.getAddress();
    const { deadline, v, r, s } = await signPermit(victimOwner, spender, amount);
    await token.connect(attacker).permit(victimOwner.address, spender, amount, deadline, v, r, s);

    await expect(
      useCase.connect(relayer).depositRewardsWithPermit("victim", victimOwner.address, amount, deadline, v, r, s),
    ).to.not.be.reverted;
  });

  it("lets a use case owner withdraw only its own deposit", async function () {
    await useCase.connect(attacker).createUseCase("attack");
    await useCase.connect(victimOwner).depositRewards("attack", ethers.parseEther("50"));

    await expect(useCase.connect(attacker).emergencyWithdraw("attack")).to.be.revertedWithCustomError(
      useCase,
      "NothingToWithdraw",
    );

    await useCase.connect(victimOwner).emergencyWithdraw("attack");
    expect((await useCase.useCases("attack")).totalRewardPool).to.equal(0);
  });

  it("freezes deposits once rewards are locked", async function () {
    await useCase.connect(victimOwner).lockRewards("victim", LOCK);
    await expect(useCase.connect(victimOwner).depositRewards("victim", 1n)).to.be.revertedWithCustomError(
      useCase,
      "RewardsAlreadyLocked",
    );
  });

  it("rejects duplicate participants", async function () {
    await expect(
      useCase
        .connect(victimOwner)
        .updateRewardShares("victim", [participantA.address, participantA.address], [5000, 5000]),
    ).to.be.revertedWithCustomError(useCase, "DuplicateParticipant");
  });

  it("lets only the owner push payouts, and skips participants that already claimed", async function () {
    await useCase
      .connect(victimOwner)
      .updateRewardShares("victim", [participantA.address, participantB.address], [6000, 4000]);
    await useCase.connect(victimOwner).lockRewards("victim", LOCK);
    await passLockup();

    await expect(useCase.connect(attacker).distribute("victim")).to.be.revertedWithCustomError(
      useCase,
      "NotUseCaseOwner",
    );

    await useCase.connect(participantA).claimRewards("victim");
    await useCase.connect(victimOwner).distribute("victim");

    expect(await token.balanceOf(participantA.address)).to.equal(ethers.parseEther("600"));
    expect(await token.balanceOf(participantB.address)).to.equal(ethers.parseEther("400"));
    await expect(useCase.connect(victimOwner).distribute("victim")).to.be.revertedWithCustomError(
      useCase,
      "NoRewardsToClaim",
    );
  });
});
