import { ethers } from "ethers";
import { IncentiveSigner, signIncentiveApiRequest } from "../lib/IncentiveSigner";

// Local Anvil node and the shared HMAC secret from the root .env (INCENTIVE_API_HMAC_SECRET)
const provider = new ethers.JsonRpcProvider("http://localhost:8545");
const signer = new IncentiveSigner("YOUR_PRIVATE_KEY", "PTX_TOKEN_ADDRESS", provider);

async function example() {
  // The depositor signs an EIP-2612 permit for the use case contract...
  const depositRequest = await signer.createUseCaseDepositRequest(
    "use-case-123", // use case ID
    "USE_CASE_CONTRACT_ADDRESS",
    "100.0" // amount in PTX
  );

  // ...and the request is authenticated for the incentive API, which relays it on-chain.
  const body = JSON.stringify(depositRequest);
  const response = await fetch("http://incentive-api:3000/api/incentives/distribute", {
    method: "POST",
    headers: signIncentiveApiRequest(body, process.env.INCENTIVE_API_HMAC_SECRET || ""),
    body,
  });
  console.log(response.status, await response.json());
}

example().catch(console.error);
