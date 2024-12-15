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

  // Write to frontend
  const abiPath = path.join(__dirname, "../../frontend/src/config/abis.ts");
  const content = `
// This file is auto-generated. Do not edit.
export const USECASE_ABI = ${JSON.stringify(
    abis.UseCaseContract,
    null,
    2
  )} as const;
export const TOKEN_ABI = ${JSON.stringify(abis.PTXToken, null, 2)} as const;
`;

  fs.writeFileSync(abiPath, content);
  console.log(`ABIs exported to ${abiPath}`);
}

main().catch(console.error);
