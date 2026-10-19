import { ethers } from "hardhat";
import fs from "fs";
import path from "path";

// Idempotent bootstrap of the service wallets on the local chain, run at every node start:
//  - INCENTIVE_RELAYER_ADDRESS gets gas and RELAYER_ROLE (it relays permit deposits)
//  - TRACE_OPERATOR_ADDRESS gets gas and PTX (it funds the reward pools of the use cases it settles)
// Only addresses are passed in; the service private keys never reach the chain container.
const MIN_GAS_BALANCE = ethers.parseEther("10");
const GAS_TOP_UP = ethers.parseEther("100");
const MIN_OPERATOR_PTX = ethers.parseEther(process.env.OPERATOR_MIN_PTX || "100000");

function requireAddress(name: string): string {
  const value = process.env[name] || "";
  if (!ethers.isAddress(value)) {
    throw new Error(`${name} must be set to a wallet address (run "make init")`);
  }
  return ethers.getAddress(value);
}

async function main() {
  const relayer = requireAddress("INCENTIVE_RELAYER_ADDRESS");
  const operator = requireAddress("TRACE_OPERATOR_ADDRESS");
  const deployment = JSON.parse(
    fs.readFileSync(path.join(__dirname, "../deployment.local.json"), "utf8")
  );

  const [deployer] = await ethers.getSigners();
  const token = await ethers.getContractAt("PTXToken", deployment.PTX_TOKEN_ADDRESS, deployer);
  const useCase = await ethers.getContractAt(
    "UseCaseContract",
    deployment.USECASE_CONTRACT_ADDRESS,
    deployer
  );

  for (const wallet of [relayer, operator]) {
    if ((await ethers.provider.getBalance(wallet)) < MIN_GAS_BALANCE) {
      await (await deployer.sendTransaction({ to: wallet, value: GAS_TOP_UP })).wait();
      console.log(`Funded ${wallet} with gas`);
    }
  }

  const relayerRole = await useCase.RELAYER_ROLE();
  if (!(await useCase.hasRole(relayerRole, relayer))) {
    await (await useCase.grantRole(relayerRole, relayer)).wait();
    console.log(`Granted RELAYER_ROLE to ${relayer}`);
  }

  const operatorBalance = await token.balanceOf(operator);
  if (operatorBalance < MIN_OPERATOR_PTX) {
    await (await token.transfer(operator, MIN_OPERATOR_PTX - operatorBalance)).wait();
    console.log(`Topped up operator ${operator} to ${ethers.formatEther(MIN_OPERATOR_PTX)} PTX`);
  }

  console.log("Service wallets bootstrapped.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
