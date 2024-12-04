/** @type import('hardhat/config').HardhatUserConfig */

import { task } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@nomicfoundation/hardhat-ethers";
import "@nomicfoundation/hardhat-foundry";
import "@nomicfoundation/hardhat-ignition";

task("accounts", "Prints the list of accounts", async () => {
  const accounts = await ethers.getSigners();

  for (const account of accounts) {
    const balance = await ethers.provider.getBalance(account.address);
    console.log(
      `Address: ${account.address} | Balance: ${ethers.formatEther(
        balance
      )} ETH`
    );
  }
});

module.exports = {
  solidity: "0.8.27",
  networks: {
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337,
    },
  },
  ignition: {
    module: "./ignition/PTXTokenModule.ts",
  },
};
