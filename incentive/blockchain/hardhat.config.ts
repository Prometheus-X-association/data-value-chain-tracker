import { HardhatUserConfig, task } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@nomicfoundation/hardhat-ethers";
if (process.env.NODE_ENV !== "docker") {
  require("@nomicfoundation/hardhat-foundry");
}
import "@nomicfoundation/hardhat-ignition";
import "@typechain/hardhat";

task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    const balance = await hre.ethers.provider.getBalance(account.address);
    console.log(
      `Address: ${account.address} | Balance: ${hre.ethers.formatEther(
        balance
      )} ETH`
    );
  }
});

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.27",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200, // Adjust the number of runs for optimization
      },
      viaIR: true,
    },
  },
  paths: {
    sources: "./src", // Make sure this matches where your .sol files are
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
  networks: {
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337,
    },
  },
};

export default config;
