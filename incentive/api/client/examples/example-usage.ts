import { IncentiveSigner } from "../lib/IncentiveSigner";

// Initialize signer with private key received from API
const signer = new IncentiveSigner("YOUR_PRIVATE_KEY", "YOUR_CLIENT_ID");

// Create signed request
const request = signer.createSignedRequest(
  "0x123...", // recipient address
  "1.5", // amount
  "data_provider", // event name
  "0.8" // performance factor
);

// Send to API
const response = await fetch("https://api.example.com/distribute", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(request),
});
