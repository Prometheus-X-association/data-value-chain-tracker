import express from "express";
import { exec } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import axios from "axios";
import { spawn } from "child_process";
import kill from 'tree-kill';
import createHttpError from "http-errors";

const app = express();
const PORT = 9091;
const environment = process.env.ENVIRONMENT;

// Middleware to parse JSON requests
app.use(express.json());

const addresses = 
    ["0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a",
      "0x8b3a350cf5c34c9194ca85829a2df0ec3153be0318b5e2d3348e872092edffba",
      "0x92db14e403b83dfe3df233f83dfa3a0d7096f21ca9b0d6d6b8d88b2b4ec1564e",
      "0x4bbbf85ce3377467afe5d46f804f221813b2bb87f24d81f60f1fcdbf7cbf4356",
    ]

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

// Endpoint to trigger the test script
app.post("/api/run-script", async (req, res) => {
  try {    
    // Always send traceability data
    try {
      const payload={
        "dvctId": "string",
        "usecaseContractTitle": req.body.usecaseContractTitle,
        "contractId": req.body.contactId,
        "dataId": req.body.dataId,
        "dataProviderId": req.body.dataProviderId,
        "dataConsumerId": req.body.dataConsumerId,
        "prevDataId": [
          ""
        ],
        "incentiveForDataProvider": {
          "numPoints": 0,
          "factor": 0,
          "factorCheck": true
        },
        "extraIncentiveForAIProvider": {
          "numPoints": 0,
          "factor": 0,
          "factorCheck": true
        },
      }

      validatePayload(req.body);
      let baseUrl = 'http://localhost:9081';

      if(environment === 'production'){
        baseUrl = 'http://core-api:9081';
      }

      const nodes = await axios.get(baseUrl + "/api/data", {
        headers: { "Content-Type": "application/json" }
      });

      if(nodes.data.length === 0){
        payload.prevDataId = [''];
        payload.incentiveForDataProvider.numPoints = req.body.participantShare.filter((obj) => obj.participantId === req.body.currentParticipantId)[0]?.numOfShare;
        payload.extraIncentiveForAIProvider.numPoints = req.body.participantShare.filter((obj) => obj.participantId === req.body.nextParticipantId)[0]?.numOfShare;
      }else{
        payload.prevDataId = [nodes.data.filter((obj)=> obj.nodeMetadata.incentiveReceivedFrom[0].organizationId === req.body.dataProviderId )[0]?.nodeId];
        payload.extraIncentiveForAIProvider.numPoints = req.body.participantShare.filter((obj) => obj.participantId === req.body.nextParticipantId)[0]?.numOfShare;
      }

      const response = await axios.post(baseUrl + "/api/node", payload, {
        headers: { "Content-Type": "application/json" }
      });
      console.log("Success:", response.data);
    } catch (error) {
      console.error("Error sending traceability data:", error);
      return res.status(500).send({ message: "Failed to send traceability data", error: error.message });
    }

    // If reachEndFlow is false, return early
    if (!req.body.reachEndFlow) {
      return res.status(200).send({ message: "Traceability data sent successfully" });
    }

    // If reachEndFlow is true, continue with script execution
    const body = req.body;
    var index = 0;
    body.participantShare.forEach((participant) =>{
      if(participant.rewardDepositor){
        participant.participantWallet = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
      }else{
        participant.participantWallet = addresses[index];
        index = index + 1;
      }
    })

    const config = body;
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);

    // Save JSON configuration to a temporary file
    const configPath = path.join(__dirname, "temp-config.json");
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

    console.log("Starting Hardhat node...");
    const hardhatNode = spawn("npm", ["run", "start:node"]);

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
    await new Promise((resolve) => setTimeout(resolve, 8000)); // Adjust as needed
  
    const command = `npx ts-node -P ./tsconfig.json './e2e-tests/integration/incentiveAndTraceability.ts'`;

    const execOptions = {
      env: { 
        ...process.env, 
        CONFIG_FILE: configPath 
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
      console.log("Killing Hardhat node...");
      kill(hardhatNode.pid, 'SIGTERM');

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

