import amqp from "amqplib";
import { createPublicClient, createWalletClient, http, stringify } from "viem";
import { mainnet } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import crypto from "crypto";
import dotenv from "dotenv";

dotenv.config();

const RABBITMQ_URL = process.env.RABBITMQ_URL || "amqp://localhost";
const QUEUE_NAME = process.env.RABBITMQ_QUEUE || "incentiveQueue";
const PUBLIC_KEY = process.env.PUBLIC_KEY || "";
const BLOCKCHAIN_RPC_URL = process.env.BLOCKCHAIN_RPC_URL || "";
const PRIVATE_KEY = process.env.PRIVATE_KEY || "";

if (!PUBLIC_KEY || !BLOCKCHAIN_RPC_URL || !PRIVATE_KEY) {
  throw new Error("Missing essential environment variables");
}

const publicClient = createPublicClient({
  chain: mainnet,
  transport: http(BLOCKCHAIN_RPC_URL),
});

const account = privateKeyToAccount(`0x${PRIVATE_KEY}`);
const walletClient = createWalletClient({
  account,
  chain: mainnet,
  transport: http(BLOCKCHAIN_RPC_URL),
});

function verifyMessage(data: any): boolean {
  const { metadata, ...originalData } = data;
  const { hash, signature, timestamp, nonce } = metadata;

  // Check if the message is too old
  const currentTimestamp = Math.floor(Date.now() / 1000);
  if (currentTimestamp - timestamp > 300) {
    console.error("Message expired.");
    return false;
  }

  // Recalculate the hash and verify it matches the provided hash
  const recalculatedHash = crypto
    .createHash("sha256")
    .update(JSON.stringify(originalData))
    .digest("hex");

  if (hash !== recalculatedHash) {
    console.error("Hash mismatch.");
    return false;
  }

  // Verify the signature using the public key
  const verify = crypto.createVerify("RSA-SHA256");
  verify.update(hash);
  verify.end();
  return verify.verify(PUBLIC_KEY, signature, "hex");
}

async function processMessage(data: any) {
  const { contractId, distribution } = data;

  try {
    // Loop through each provider to dispatch incentives
    for (const { provider, points } of distribution) {
      const tx = await walletClient.sendTransaction({
        to: provider, // Blockchain address of the provider
        value: BigInt(points), // Convert points to BigInt for viem
        chain: mainnet,
      });

      console.log(`Transaction sent to ${provider}:`, tx);

      // Wait for confirmation
      const receipt = await publicClient.waitForTransactionReceipt({
        hash: tx,
      });
      console.log(`Transaction confirmed: ${receipt.transactionHash}`);
    }

    console.log(
      "Incentive distribution processed for contract ID:",
      contractId,
    );
  } catch (error) {
    console.error("Failed to process message on the blockchain:", error);
  }
}

async function consumeMessages() {
  try {
    const connection = await amqp.connect(RABBITMQ_URL);
    const channel = await connection.createChannel();

    await channel.assertQueue(QUEUE_NAME, { durable: true });

    console.log(`Waiting for messages in queue: ${QUEUE_NAME}`);

    channel.consume(QUEUE_NAME, async (msg) => {
      if (msg !== null) {
        const message = JSON.parse(msg.content.toString());

        if (verifyMessage(message)) {
          await processMessage(message);
          channel.ack(msg);
        } else {
          console.error("Message verification failed.");
          // Might want a deadletter queue
          channel.nack(msg, false, false);
        }
      }
    });
  } catch (error) {
    console.error("Error consuming messages:", error);
  }
}

consumeMessages();
