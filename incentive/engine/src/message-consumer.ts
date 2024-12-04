import amqp from "amqplib";
import { ethers } from "ethers";
import crypto, { createHmac, timingSafeEqual } from "crypto";
import dotenv from "dotenv";

dotenv.config();

const RABBITMQ_URL = process.env.RABBITMQ_URL || "amqp://localhost";
const QUEUE_NAME = process.env.RABBITMQ_QUEUE || "incentiveQueue";
const PUBLIC_KEY = process.env.PUBLIC_KEY || "";
const BLOCKCHAIN_RPC_URL = process.env.BLOCKCHAIN_RPC_URL || "";
const PRIVATE_KEY = process.env.PRIVATE_KEY || "";
const BLOCKCHAIN_PRIVATE_KEY = process.env.BLOCKCHAIN_PRIVATE_KEY || "";

if (!PUBLIC_KEY || !BLOCKCHAIN_RPC_URL || !PRIVATE_KEY) {
  throw new Error("Missing essential environment variables");
}

const provider = new ethers.JsonRpcProvider(BLOCKCHAIN_RPC_URL);
const wallet = new ethers.Wallet(BLOCKCHAIN_PRIVATE_KEY, provider);

function verifyMessage(data: any): boolean {
  const { metadata, ...originalData } = data;
  const { hash, signature, timestamp, nonce } = metadata;

  const currentTimestamp = Math.floor(Date.now() / 1000);
  if (currentTimestamp - timestamp > 300) {
    console.error("Message expired.");
    return false;
  }

  const recalculatedHash = crypto
    .createHash("sha256")
    .update(JSON.stringify(originalData))
    .digest("hex");

  if (hash !== recalculatedHash) {
    console.error("Hash mismatch.");
    return false;
  }

  const expectedSignature = createHmac("sha256", PRIVATE_KEY)
    .update(hash)
    .digest("base64");

  const expectedBuffer = Buffer.from(expectedSignature, "base64");
  const signatureBuffer = Buffer.from(signature, "base64");

  if (
    expectedBuffer.length !== signatureBuffer.length ||
    !timingSafeEqual(expectedBuffer, signatureBuffer)
  ) {
    console.error("Signature mismatch.");
    return false;
  }

  return true;
}

async function processMessage(data: any) {
  const { contractId, distribution } = data;

  try {
    for (const { provider, points, public_key } of distribution) {
      // Send the transaction using the wallet
      const tx = await wallet.sendTransaction({
        to: public_key,
        value: ethers.parseEther(points.toString()),
      });

      console.log(`Transaction sent to ${provider}:`, tx.hash);

      // Wait for confirmation
      const receipt = await tx.wait();
      console.log(`Transaction confirmed: ${receipt}`);
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
  const maxRetries = 5;
  const retryDelay = 5000;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log("Connecting to:", RABBITMQ_URL);
      const connection = await amqp.connect(RABBITMQ_URL);
      const channel = await connection.createChannel();

      await channel.assertQueue(QUEUE_NAME, { durable: true });

      console.log(`Waiting for messages in queue: ${QUEUE_NAME}`);

      channel.consume(QUEUE_NAME, async (msg) => {
        if (msg !== null) {
          const message = JSON.parse(msg.content.toString());

          console.log("Received message:", message);

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

      break;
    } catch (error) {
      console.error(`Attempt ${attempt} to connect to RabbitMQ failed:`, error);

      if (attempt === maxRetries) {
        console.error("Max retries reached. Exiting...");
        process.exit(1);
      }

      console.log(`Retrying in ${retryDelay / 1000} seconds...`);
      await new Promise((resolve) => setTimeout(resolve, retryDelay));
    }
  }
}

consumeMessages();
