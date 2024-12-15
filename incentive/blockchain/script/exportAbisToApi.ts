import fs from "fs";
import path from "path";
import { artifacts } from "hardhat";

async function main() {
  const contracts = ["UseCaseContract", "PTXToken"];
  const abis: Record<string, any> = {};

  for (const contractName of contracts) {
    const artifact = await artifacts.readArtifact(contractName);
    abis[contractName] = artifact.abi;
  }

  // Write to API
  const abiPath = path.join(__dirname, "../../api/src/contracts/abis.ts");

  // Ensure directory exists
  const dir = path.dirname(abiPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const content = `
// This file is auto-generated. Do not edit.
export const USECASE_ABI = ${JSON.stringify(
    abis.UseCaseContract,
    null,
    2
  )} as const;

export type UseCaseFactoryAbi = typeof FACTORY_ABI;
export type UseCaseContractAbi = typeof USECASE_ABI;
`;

  fs.writeFileSync(abiPath, content);
  console.log(`ABIs exported to ${abiPath}`);
}

main().catch(console.error);
