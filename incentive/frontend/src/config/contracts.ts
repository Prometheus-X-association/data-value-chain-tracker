import { type Address } from "viem";
import { FACTORY_ABI, USECASE_ABI, TOKEN_ABI } from "./abis";
import deploymentInfo from "./deployment.json";

export const FACTORY_ADDRESS = (process.env.NEXT_PUBLIC_FACTORY_ADDRESS ??
  deploymentInfo.FACTORY_ADDRESS) as Address;
export const TOKEN_ADDRESS = (process.env.NEXT_PUBLIC_TOKEN_ADDRESS ??
  deploymentInfo.PTX_TOKEN_ADDRESS) as Address;

export { FACTORY_ABI, USECASE_ABI, TOKEN_ABI };
