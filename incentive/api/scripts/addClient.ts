import { KeyManagementService } from "../src/services/KeyManagementService";
import { FileKeyStorage } from "../src/storage/FileKeyStorage";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  // Get client ID from command line
  const clientId = process.argv[2];
  if (!clientId) {
    console.error("Please provide a client ID as parameter");
    console.log("Usage: npx ts-node scripts/addClient.ts <clientId>");
    process.exit(1);
  }

  const storage = new FileKeyStorage();
  const keyManager = new KeyManagementService(storage);

  try {
    const existingKey = await keyManager.getPublicKey(clientId);
    if (existingKey) {
      console.error(`Client ${clientId} already exists!`);
      process.exit(1);
    }

    const permissions = ["distribute"];
    const { privateKey, publicKey } = await keyManager.generateKeyPair(
      clientId,
      permissions
    );

    // Save private key to a separate secure file
    const privateKeyDir = path.join(__dirname, "../private-keys");
    if (!fs.existsSync(privateKeyDir)) {
      fs.mkdirSync(privateKeyDir, { recursive: true });
    }

    const privateKeyFile = path.join(privateKeyDir, `${clientId}.key`);
    fs.writeFileSync(privateKeyFile, privateKey);

    console.log("\nClient added successfully! ✅");
    console.log("----------------------------------------");
    console.log(`Client ID: ${clientId}`);
    console.log(`Permissions: ${permissions.join(", ")}`);
    console.log(`Private key saved to: ${privateKeyFile}`);
    console.log(
      "\n⚠️  IMPORTANT: Keep the private key secure and share it safely with the client!"
    );
  } catch (error) {
    console.error("Error adding client:", error);
    process.exit(1);
  }
}

main().catch(console.error);
