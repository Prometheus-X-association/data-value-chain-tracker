const hre = require("hardhat");
const { ethers } = hre;

async function main() {
  const initialSupply = ethers.parseUnits("1000", 18); // 1000 tokens with 18 decimals
  const PTXToken = await hre.ethers.getContractFactory("PTXToken");
  const token = await PTXToken.deploy(initialSupply);

  await token.deployed();
  console.log(`Token deployed to: ${token.address}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
