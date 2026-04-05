import express from "express";
import { exec } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import axios from "axios";
import { ethers } from "ethers";
import { spawn } from "child_process";
import kill from 'tree-kill';
import createHttpError from "http-errors";

const app = express();
const PORT = 9091;
const environment = process.env.ENVIRONMENT;
const incentiveRpcUrl = process.env.INCENTIVE_RPC_URL || "http://127.0.0.1:8545";
const incentiveApiUrl = process.env.INCENTIVE_API_URL;
const useExternalHardhat = process.env.USE_EXTERNAL_HARDHAT === "true";
const internalApiToken = process.env.DVCT_INTERNAL_API_TOKEN || "";
const organizationWalletsJson = process.env.DVCT_ORGANIZATION_WALLETS_JSON || "[]";
const organizationWalletsFile = process.env.DVCT_ORGANIZATION_WALLETS_FILE || "";

// Middleware to parse JSON requests
app.use(express.json());

const PRIVATE_KEY_PATTERN = /^0x[0-9a-fA-F]{64}$/;

function validatePayload(payload) {
  const requiredFields = [
    "dvctId",
    "contractId",
    "useCaseContractTitle",
    "dataId",
    "dataProviderId",
    "dataConsumerId",
    "factorCheck",
    "reachEndFlow",
    "providerUrl",
    "currentParticipantId",
    "nextParticipantId",
    "useCaseId",
    "useCaseName",
    "dataQualityCheck",
    "participantShare",
  ];

  for (const field of requiredFields) {
    if (
      payload[field] === undefined ||
      payload[field] === null ||
      payload[field] === ""
    ) {
      throw createHttpError(400, `Missing or invalid field: ${field}`);
    }
  }
}

function getConfiguredOrganizationWallets() {
  try {
    const registrySource = organizationWalletsFile
      ? fs.readFileSync(path.resolve(process.cwd(), organizationWalletsFile), "utf8")
      : organizationWalletsJson;
    const parsedWallets = JSON.parse(registrySource);

    if (!Array.isArray(parsedWallets)) {
      throw createHttpError(500, "Organization wallet registry must be an array");
    }

    return parsedWallets.map((wallet) => ({
      organizationId: wallet.organizationId || wallet.participantId || "",
      privateKey: wallet.privateKey || "",
      aliases: Array.isArray(wallet.aliases) ? wallet.aliases.filter(Boolean) : [],
      label: wallet.label || wallet.organizationId || wallet.participantId || "wallet",
    }));
  } catch (error) {
    if (error?.status) {
      throw error;
    }

    if (organizationWalletsFile) {
      throw createHttpError(
        500,
        `Unable to read organization wallet registry file: ${organizationWalletsFile}`,
      );
    }

    throw createHttpError(500, "DVCT_ORGANIZATION_WALLETS_JSON is not valid JSON");
  }
}

function buildOrganizationWalletLookup() {
  const walletLookup = new Map();

  getConfiguredOrganizationWallets().forEach((walletRecord) => {
    const identifiers = [
      walletRecord.organizationId,
      ...walletRecord.aliases,
    ]
      .map((value) => String(value || "").trim())
      .filter(Boolean);

    if (!walletRecord.organizationId || !PRIVATE_KEY_PATTERN.test(walletRecord.privateKey)) {
      throw createHttpError(
        500,
        `Wallet registry entry "${walletRecord.label}" is missing a valid organizationId or privateKey`,
      );
    }

    walletRecord.walletAddress = new ethers.Wallet(walletRecord.privateKey).address;

    identifiers.forEach((identifier) => {
      if (walletLookup.has(identifier)) {
        throw createHttpError(
          500,
          `Duplicate wallet registry identifier detected: ${identifier}`,
        );
      }

      walletLookup.set(identifier, walletRecord);
    });
  });

  return walletLookup;
}

function resolveParticipantWallets(body) {
  const walletLookup = buildOrganizationWalletLookup();
  const participants = Array.isArray(body.participantShare) ? body.participantShare : [];

  return participants.map((participant) => {
    const participantId = String(participant.participantId || "").trim();
    const walletRecord = walletLookup.get(participantId);

    if (!walletRecord) {
      throw createHttpError(
        400,
        `No wallet mapping found for participant "${participantId || participant.participantName || participant.role}"`,
      );
    }

    return {
      ...participant,
      participantWallet: walletRecord.privateKey,
      participantWalletAddress: walletRecord.walletAddress,
      walletOrganizationId: walletRecord.organizationId,
    };
  });
}

function buildTraceabilitySequence(body) {
  const participants = Array.isArray(body.participantShare) ? body.participantShare : [];
  const shareById = new Map(participants.map((participant) => [participant.participantId, participant]));

  return {
    currentParticipant: shareById.get(body.currentParticipantId) || null,
    nextParticipant: shareById.get(body.nextParticipantId) || null,
  };
}

function buildParticipantNodeReference(body, participantId) {
  const useCaseId = body.useCaseId || body.usecaseContractId || body.contractId || body.dvctId;

  if (body.dataId && useCaseId && participantId) {
    return `trace-node:${useCaseId}:${body.dataId}:${participantId}`;
  }

  if (body.dataId && body.dvctId && participantId) {
    return `trace-node:${body.dvctId}:${body.dataId}:${participantId}`;
  }

  if (body.dataId && participantId) {
    return `trace-node:${body.dataId}:${participantId}`;
  }

  return participantId || "";
}

function buildTraceabilityPayloads(body, existingNodes) {
  const { currentParticipant, nextParticipant } = buildTraceabilitySequence(body);
  const providerReference = buildParticipantNodeReference(body, body.dataProviderId);
  const consumerReference = buildParticipantNodeReference(body, body.dataConsumerId);
  const providerExists = (existingNodes || []).some(
    (node) => node.canonicalKey === providerReference || node.participantId === body.dataProviderId
  );
  const consumerExists = (existingNodes || []).some(
    (node) => node.canonicalKey === consumerReference || node.participantId === body.dataConsumerId
  );
  const payloads = [];
  const providerShare = currentParticipant?.numOfShare || 0;
  const consumerShare = nextParticipant?.numOfShare || 0;

  if (!providerExists) {
    payloads.push({
      dvctId: body.dvctId,
      usecaseContractId: body.useCaseId,
      usecaseContractTitle: body.useCaseContractTitle,
      contractId: body.contractId,
      dataId: body.dataId,
      participantId: body.dataProviderId,
      participantSourceId: body.currentParticipantId,
      participantShare: providerShare,
      dataProviderId: body.dataProviderId,
      dataConsumerId: body.dataConsumerId,
      dataConsumerIsAIProvider: false,
      prevDataId: [],
      incentiveForDataProvider: {
        numPoints: providerShare,
        factor: 1,
        factorCheck: true,
      },
      extraIncentiveForAIProvider: {
        numPoints: providerShare,
        factor: 1,
        factorCheck: true,
      },
    });
  }

  payloads.push({
    dvctId: body.dvctId,
    usecaseContractId: body.useCaseId,
    usecaseContractTitle: body.useCaseContractTitle,
    contractId: body.contractId,
    dataId: body.dataId,
    participantId: body.dataConsumerId,
    participantSourceId: body.nextParticipantId,
    participantShare: consumerShare,
    dataProviderId: body.dataProviderId,
    dataConsumerId: body.dataConsumerId,
    dataConsumerIsAIProvider: true,
    prevDataId: providerReference ? [providerReference] : [],
    incentiveForDataProvider: {
      numPoints: providerShare,
      factor: 1,
      factorCheck: true,
    },
    extraIncentiveForAIProvider: {
      numPoints: consumerShare,
      factor: 1,
      factorCheck: true,
    },
  });

  return payloads;
}

// Endpoint to trigger the test script
app.post("/api/run-script", async (req, res) => {
  try {    
    // Always send traceability data
    try {
      validatePayload(req.body);
      let baseUrl = 'http://localhost:9081';

      if(environment === 'production'){
        baseUrl = 'http://core-api:9081';
      }

      const nodes = await axios.get(baseUrl + "/api/internal/data", {
        headers: {
          "Content-Type": "application/json",
          "X-DVCT-Internal-Token": internalApiToken,
        }
      });

      const traceabilityPayloads = buildTraceabilityPayloads(
        {
          ...req.body,
          contractId: req.body.contractId,
          useCaseContractTitle: req.body.useCaseContractTitle,
        },
        nodes.data
      );

      for (const payload of traceabilityPayloads) {
        const response = await axios.post(baseUrl + "/api/node", payload, {
          headers: { "Content-Type": "application/json" }
        });
        console.log("Success:", response.data);
      }
    } catch (error) {
      console.error("Error sending traceability data:", error);
      return res.status(500).send({ message: "Failed to send traceability data", error: error.message });
    }

    // If reachEndFlow is false, return early
    if (!req.body.reachEndFlow) {
      return res.status(200).send({ message: "Traceability data sent successfully" });
    }

    // If reachEndFlow is true, continue with script execution
    const config = {
      ...req.body,
      participantShare: resolveParticipantWallets(req.body),
    };
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);

    // Save JSON configuration to a temporary file
    const configPath = path.join(__dirname, "temp-config.json");
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

    let hardhatNode;
    if (!useExternalHardhat) {
      console.log("Starting Hardhat node...");
      hardhatNode = spawn("npm", ["run", "start:node"]);

      hardhatNode.stdout.on("data", (data) => {
        console.log(`[Hardhat]: ${data}`);
      });

      hardhatNode.stderr.on("data", (data) => {
        console.error(`[Hardhat ERROR]: ${data}`);
      });

      hardhatNode.on("error", (err) => {
        console.error("Failed to start Hardhat node:", err);
      });

      // Wait for Hardhat to start (naive method: sleep 5-10 seconds)
      await new Promise((resolve) => setTimeout(resolve, 8000));
    } else {
      console.log(`Using external Hardhat node at ${incentiveRpcUrl}`);
    }
  
    const command = `npx ts-node -P ./tsconfig.json './e2e-tests/integration/incentiveAndTraceability.ts'`;

    const execOptions = {
      env: { 
        ...process.env, 
        CONFIG_FILE: configPath,
        INCENTIVE_RPC_URL: incentiveRpcUrl,
        ...(incentiveApiUrl ? { INCENTIVE_API_URL: incentiveApiUrl } : {}),
      }
    };

    exec(command, execOptions, (error, stdout, stderr) => {
      if (error) {
        console.error("Error executing script:", error);
        console.log("stdout:", stdout);
        console.log("stderr:", stderr);
        return res.status(500).send({ message: "Error executing script", error: error.message, stdout, stderr });
      }

      console.log("Script stdout:", stdout);
      if (hardhatNode?.pid) {
        console.log("Killing Hardhat node...");
        kill(hardhatNode.pid, 'SIGTERM');
      }

      res.status(200).send({ message: "Script executed successfully", stdout, stderr });

      //Clean up the temporary file
      fs.unlinkSync(configPath);
    });

  } catch (err) {
    console.error("Error:", err);
    res.status(500).send({ message: "Failed to execute script", error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
