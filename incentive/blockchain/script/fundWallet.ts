import { ethers } from "hardhat";
import fs from "fs";
import path from "path";

function getTargetAddress(): string {
  const cliAddress = process.argv[2];
  const envAddress = process.env.TARGET_WALLET;
  const address = cliAddress ?? envAddress;

  if (address === undefined) {
    throw new Error(
      "Missing target wallet address. Pass it as the first argument or set TARGET_WALLET."
    );
  }

  if (!ethers.isAddress(address)) {
    throw new Error(`Invalid wallet address: ${address}`);
  }

  return address;
}

function getTokenAddress(): string {
  const deploymentPath = path.join(
    __dirname,
    "../../frontend/src/config/deployment.json"
  );

  if (!fs.existsSync(deploymentPath)) {
    throw new Error(
      `Missing deployment file at ${deploymentPath}. Run ptx-deploy-test first.`
    );
  }

  const deploymentInfo = JSON.parse(fs.readFileSync(deploymentPath, "utf8")) as {
    PTX_TOKEN_ADDRESS?: string;
  };

  if (
    deploymentInfo.PTX_TOKEN_ADDRESS === undefined ||
    !ethers.isAddress(deploymentInfo.PTX_TOKEN_ADDRESS)
  ) {
    throw new Error("PTX token address missing or invalid in deployment.json");
  }

  return deploymentInfo.PTX_TOKEN_ADDRESS;
}

async function main() {
  const targetAddress = getTargetAddress();
  const tokenAddress = getTokenAddress();
  const [deployer] = await ethers.getSigners();

  const ethAmount = ethers.parseEther(process.env.FUND_ETH ?? "10");
  const ptxAmount = ethers.parseEther(process.env.FUND_PTX ?? "10000");

  const token = await ethers.getContractAt("PTXToken", tokenAddress, deployer);

  console.log(`Funding wallet: ${targetAddress}`);
  console.log(`Using deployer: ${deployer.address}`);
  console.log(`Sending ${ethers.formatEther(ethAmount)} ETH`);
  console.log(`Sending ${ethers.formatEther(ptxAmount)} PTX`);

  const ethTx = await deployer.sendTransaction({
    to: targetAddress,
    value: ethAmount,
  });
  await ethTx.wait();

  const tokenTx = await token.transfer(targetAddress, ptxAmount);
  await tokenTx.wait();

  console.log("Funding complete.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
