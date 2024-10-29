import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { ethers } from "ethers";

const PTXTokenModule = buildModule("PTXTokenModule", (m) => {
  // Define a parameter for the initial supply, defaulting to 1000 tokens with 18 decimals
  const initialSupply = m.getParameter(
    "initialSupply",
    ethers.parseUnits("1000", 18)
  );

  // Deploy the PTXToken contract with the initial supply
  const token = m.contract("PTXToken", [initialSupply]);

  return { token };
});

export default PTXTokenModule;
