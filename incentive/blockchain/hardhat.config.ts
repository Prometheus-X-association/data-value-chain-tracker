/** @type import('hardhat/config').HardhatUserConfig */

import "@nomicfoundation/hardhat-toolbox";
import "@nomicfoundation/hardhat-foundry";
import "@nomicfoundation/hardhat-ignition";

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
