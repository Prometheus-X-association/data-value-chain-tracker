import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);

  const result = await (
    await ethers.deployContract("PTXProtocol")
  ).waitForDeployment();

  console.log("Deployment completed:");
  console.log("PTX Token:", await result.ptxToken());
  console.log("Use Case Factory:", await result.factory());
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
