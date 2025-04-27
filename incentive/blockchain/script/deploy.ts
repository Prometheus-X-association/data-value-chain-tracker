import { ethers } from "hardhat";
import fs from "fs";
import path from "path";

async function main() {
  const [deployer] = await ethers.getSigners();
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

  const configDirApi = path.join(__dirname, "../../api/src/config");
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }

  fs.writeFileSync(
    path.join(configDirApi, "deployment.json"),
    JSON.stringify(deploymentInfo, null, 2)
  );

  console.log("Contracts deployed successfully!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
