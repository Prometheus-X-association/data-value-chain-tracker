import { type Address } from "viem";
import { USECASE_ABI, TOKEN_ABI } from "./abis";
import deploymentInfo from "./deployment.json";

export const USECASE_CONTRACT_ADDRESS =
  deploymentInfo.USECASE_CONTRACT_ADDRESS as Address;
export const TOKEN_ADDRESS = deploymentInfo.PTX_TOKEN_ADDRESS as Address;

export { USECASE_ABI, TOKEN_ABI };
