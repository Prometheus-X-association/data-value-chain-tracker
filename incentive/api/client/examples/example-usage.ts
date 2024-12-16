import { ethers } from "ethers";
import { IncentiveSigner } from "../lib/IncentiveSigner";

// Setup provider (example using local hardhat node)
const provider = new ethers.JsonRpcProvider("http://localhost:8545");

// Initialize signer with required parameters
const signer = new IncentiveSigner(
  "YOUR_PRIVATE_KEY",
  "PTX_TOKEN_ADDRESS",
  provider
);

async function examples() {
  // Example 1: Create a use case deposit request
  const useCaseRequest = await signer.createUseCaseDepositRequest(
    "use-case-123", // use case ID
    "USE_CASE_CONTRACT_ADDRESS", // use case contract address
    "100.0" // amount in tokens
  );

  // Example 2: Create a direct token reward request
  const tokenRequest = await signer.createTokenRewardRequest(
    "RECIPIENT_ADDRESS", // recipient address
    "50.0", // amount in tokens
    "data_provider" // incentive type
  );

  // Example API calls
  const response1 = await fetch("API_URL/distribute", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(useCaseRequest),
  });

  const response2 = await fetch("API_URL/distribute", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(tokenRequest),
  });
}

examples().catch(console.error);
