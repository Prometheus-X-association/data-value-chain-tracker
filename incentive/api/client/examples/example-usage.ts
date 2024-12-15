import { ethers } from "ethers";
import { IncentiveSigner } from "../lib/IncentiveSigner";

// Setup provider (example using local hardhat node)
const provider = new ethers.JsonRpcProvider("http://localhost:8545");

// Initialize signer with required parameters
const signer = new IncentiveSigner(
  "YOUR_PRIVATE_KEY",
  "PTX_TOKEN_ADDRESS",
  "API_WALLET_ADDRESS", // Optional - only needed for use case deposits
  provider,
  "USE_CASE_CONTRACT_ADDRESS" // Optional - only needed for use case deposits
);

// Example 1: Create a use case deposit request
const useCaseRequest = await signer.createUseCaseDepositRequest(
  "use-case-123",
  "100.0" // amount in tokens
);

// Example 2: Create a direct token reward request
const tokenRequest = await signer.createTokenRewardRequest(
  "50.0", // amount in tokens
  "data_provider" // incentive type
);
