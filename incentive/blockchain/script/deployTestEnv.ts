import { ethers } from "hardhat";
import fs from "fs";
import path from "path";
import { PTXToken, UseCaseFactory, UseCaseContract } from "../typechain-types";

async function main() {
  const [owner, operator, notifier1, notifier2, participant1, participant2] =
    await ethers.getSigners();
  console.log("Deploying contracts with account:", owner.address);

  // Deploy PTX Token
  const PTXToken = await ethers.getContractFactory("PTXToken");
  const token = await PTXToken.deploy(ethers.parseEther("1000000"));
  await token.waitForDeployment();
  console.log("PTX Token deployed to:", await token.getAddress());

  // Deploy Factory
  const Factory = await ethers.getContractFactory("UseCaseFactory");
  const factory = await Factory.deploy(await token.getAddress());
  await factory.waitForDeployment();
  console.log("Factory deployed to:", await factory.getAddress());

  // Setup use cases
  const useCases = [
    {
      name: "Active Data Quality",
      events: ["DataProvided", "QualityVerified"],
      rewards: [ethers.parseEther("100"), ethers.parseEther("50")],
      lockDuration: 24 * 60 * 60, // 1 day
      owner: owner,
      shouldPause: false,
    },
    {
      name: "Inactive Model Training",
      events: ["DatasetCreated", "ModelTrained", "ModelValidated"],
      rewards: [
        ethers.parseEther("150"),
        ethers.parseEther("200"),
        ethers.parseEther("100"),
      ],
      lockDuration: 7 * 24 * 60 * 60, // 1 week
      owner: owner,
      shouldPause: true,
    },
    {
      name: "Zero Lock Duration",
      events: ["QuickVerification", "InstantValidation"],
      rewards: [ethers.parseEther("75"), ethers.parseEther("25")],
      lockDuration: 0, // No lock
      owner: participant1,
      shouldPause: false,
    },
    {
      name: "Large Reward Pool",
      events: ["MajorContribution", "PeerReview", "FinalApproval"],
      rewards: [
        ethers.parseEther("1000"),
        ethers.parseEther("500"),
        ethers.parseEther("250"),
      ],
      lockDuration: 3 * 24 * 60 * 60, // 3 days
      owner: participant2,
      shouldPause: false,
    },
    {
      name: "Multiple Events",
      events: ["Event1", "Event2", "Event3", "Event4", "Event5"],
      rewards: [
        ethers.parseEther("100"),
        ethers.parseEther("100"),
        ethers.parseEther("100"),
        ethers.parseEther("100"),
        ethers.parseEther("100"),
      ],
      lockDuration: 1 * 60 * 60, // 1 hour
      owner: owner,
      shouldPause: false,
    },
  ];

  // Add notifiers
  await factory.addOperator(operator.address);
  await factory.connect(operator).addGlobalNotifier(notifier1.address);
  await factory.connect(operator).addGlobalNotifier(notifier2.address);
  console.log(
    `Added global notifiers: ${notifier1.address}, ${notifier2.address}`
  );

  // Deploy use cases
  const deployedUseCases: UseCaseContract[] = [];
  for (const useCase of useCases) {
    // Transfer tokens to owner if needed
    if (useCase.owner.address !== owner.address) {
      const totalPossibleRewards =
        useCase.rewards.reduce((a, b) => a + b, 0n) * 5n;
      const rewardPool = totalPossibleRewards + ethers.parseEther("100");
      await token.transfer(useCase.owner.address, rewardPool);
      await token
        .connect(useCase.owner)
        .approve(await factory.getAddress(), rewardPool);
    }

    // Calculate total possible rewards
    const totalPossibleRewards =
      useCase.rewards.reduce((a, b) => a + b, 0n) * 5n;
    const rewardPool = totalPossibleRewards + ethers.parseEther("100");

    if (useCase.owner.address === owner.address) {
      await token.approve(await factory.getAddress(), rewardPool);
    }

    const tx = await factory
      .connect(useCase.owner)
      .createUseCase(
        useCase.lockDuration,
        useCase.events,
        useCase.rewards,
        rewardPool
      );
    const receipt = await tx.wait();

    // Get use case address from event
    const event = receipt?.logs.find((log) => {
      try {
        return (
          factory.interface.parseLog(log as any)?.name === "UseCaseCreated"
        );
      } catch {
        return false;
      }
    });
    const parsedEvent = factory.interface.parseLog(event as any);
    const useCaseId = parsedEvent?.args[0];
    const useCaseAddress = await factory.useCaseContracts(useCaseId);
    const useCaseContract = (await ethers.getContractAt(
      "UseCaseContract",
      useCaseAddress
    )) as UseCaseContract;
    deployedUseCases.push(useCaseContract);

    console.log(
      `Deployed use case ${useCase.name} with id #${useCaseId} to: ${useCaseAddress}`
    );

    // Pause if needed
    if (useCase.shouldPause) {
      await useCaseContract.connect(useCase.owner).pause();
      console.log(`Paused use case: ${useCase.name}`);
    }

    // Notify events for some participants
    if (!useCase.shouldPause) {
      const participants = [participant1, participant2];
      const notifiers = [notifier1, notifier2];

      for (const participant of participants) {
        for (const [index, eventName] of useCase.events.entries()) {
          if (index < 2) {
            const notifier = notifiers[index % notifiers.length];
            await useCaseContract
              .connect(notifier)
              .notifyEvent(
                eventName,
                participant.address,
                ethers.parseEther("0.8")
              );
            console.log(`Notified ${eventName} for ${participant.address}`);
          }
        }
      }
    }
  }

  // Output deployment information
  console.log("\nDeployment Summary:");
  console.log("==================");
  console.log(`PTX Token: ${await token.getAddress()}`);
  console.log(`Factory: ${await factory.getAddress()}`);
  console.log("\nNotifiers:");
  [notifier1, notifier2].forEach((n, i) =>
    console.log(`Notifier ${i + 1}: ${n.address}`)
  );
  console.log("\nParticipants:");
  [participant1, participant2].forEach((p, i) =>
    console.log(`Participant ${i + 1}: ${p.address}`)
  );
  console.log("\nUse Cases:");
  for (const [i, uc] of deployedUseCases.entries()) {
    console.log(`Use Case ${i + 1}: ${await uc.getAddress()}`);
  }

  // Write deployment info to a JSON file
  const deploymentInfo = {
    PTX_TOKEN_ADDRESS: await token.getAddress(),
    FACTORY_ADDRESS: await factory.getAddress(),
  };

  const configDir = path.join(__dirname, "../../frontend/src/config");
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }

  fs.writeFileSync(
    path.join(configDir, "deployment.json"),
    JSON.stringify(deploymentInfo, null, 2)
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
