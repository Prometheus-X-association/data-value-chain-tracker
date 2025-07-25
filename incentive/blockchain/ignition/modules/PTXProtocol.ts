import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const INITIAL_SUPPLY = BigInt("1000000000000000000000000"); // 1M tokens

export default buildModule("PTXProtocol", (m) => {
  const ptxToken = m.contract("PTXToken", [INITIAL_SUPPLY]);

  const useCaseContract = m.contract("UseCaseContract", [ptxToken], {
    after: [ptxToken],
  });

  return { ptxToken, useCaseContract };
});
