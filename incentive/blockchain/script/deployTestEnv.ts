import { ethers } from "hardhat";
import fs from "fs";
import path from "path";

async function main() {
  const [
    deployer,
    useCaseOwner1,
    useCaseOwner2,
    participant1,
    participant2,
    participant3,
  ] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);

  // Deploy PTX Token
  const PTXToken = await ethers.getContractFactory("PTXToken");
  const token = await PTXToken.deploy(ethers.parseEther("1000000"));
  await token.waitForDeployment();
  console.log("PTX Token deployed to:", await token.getAddress());

  // Deploy UseCase Contract
  const UseCaseContract = await ethers.getContractFactory("UseCaseContract");
  const useCase = await UseCaseContract.deploy(await token.getAddress());
  await useCase.waitForDeployment();
  console.log("UseCase Contract deployed to:", await useCase.getAddress());

  // Transfer tokens to use case owners for testing
  await token.transfer(useCaseOwner1.address, ethers.parseEther("10000"));
  await token.transfer(useCaseOwner2.address, ethers.parseEther("10000"));

  // Setup test use cases
  const useCaseContract = useCase.connect(useCaseOwner1);
  const tokenContract = token.connect(useCaseOwner1);

  // Approve token spending
  await tokenContract.approve(
    await useCase.getAddress(),
    ethers.parseEther("10000")
  );
  await token
    .connect(useCaseOwner2)
    .approve(await useCase.getAddress(), ethers.parseEther("10000"));

  // Create Use Case 1
  await useCaseContract.createUseCase("use-case-1");
  await useCaseContract.depositRewards("use-case-1", ethers.parseEther("1000"));
  await useCaseContract.updateRewardShares(
    "use-case-1",
    [participant1.address, participant2.address],
    [6000, 4000] // 60%, 40%
  );

  // Create Use Case 2
  await useCase.connect(useCaseOwner2).createUseCase("use-case-2");
  await useCase
    .connect(useCaseOwner2)
    .depositRewards("use-case-2", ethers.parseEther("2000"));
  await useCase.connect(useCaseOwner2).updateRewardShares(
    "use-case-2",
    [participant2.address, participant3.address],
    [5000, 5000] // 50%, 50%
  );

  // Create Use Case 3 (Locked, not claimable yet)
  await useCaseContract.createUseCase("use-case-3");
  await useCaseContract.depositRewards("use-case-3", ethers.parseEther("3000"));
  await useCaseContract.updateRewardShares(
    "use-case-3",
    [participant1.address, participant3.address],
    [7000, 3000] // 70%, 30%
  );
  await useCaseContract.lockRewards("use-case-3", 60); // 1 minute lockup

  // Create Use Case 4 (Locked and claimable)
  await useCase.connect(useCaseOwner2).createUseCase("use-case-4");
  await useCase
    .connect(useCaseOwner2)
    .depositRewards("use-case-4", ethers.parseEther("4000"));
  await useCase.connect(useCaseOwner2).updateRewardShares(
    "use-case-4",
    [participant1.address, participant2.address, participant3.address],
    [3000, 3000, 4000] // 30%, 30%, 40%
  );
  await useCase.connect(useCaseOwner2).lockRewards("use-case-4", 1); // 1 second lockup

  // Skip time to make use case 4 claimable
  await ethers.provider.send("evm_increaseTime", [2]); // Skip 2 seconds
  await ethers.provider.send("evm_mine", []); // Mine a new block

  // Write deployment info to a JSON file
  const deploymentInfo = {
    PTX_TOKEN_ADDRESS: await token.getAddress(),
    USECASE_CONTRACT_ADDRESS: await useCase.getAddress(),
  };

  const configDir = path.join(__dirname, "../../frontend/src/config");
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }

  fs.writeFileSync(
    path.join(configDir, "deployment.json"),
    JSON.stringify(deploymentInfo, null, 2)
  );

  console.log("Test environment deployed successfully!");
  console.log("Test accounts:");
  console.log("Use Case Owner 1:", useCaseOwner1.address);
  console.log("Use Case Owner 2:", useCaseOwner2.address);
  console.log("Participant 1:", participant1.address);
  console.log("Participant 2:", participant2.address);
  console.log("Participant 3:", participant3.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
