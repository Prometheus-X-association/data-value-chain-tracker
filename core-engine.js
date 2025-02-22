import express from "express";
import { exec } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import axios from "axios";

const app = express();
const PORT = 9091;

// Middleware to parse JSON requests
app.use(express.json());

// Endpoint to trigger the test script
app.post("/run-script", async (req, res) => {
  try {    
    // Always send traceability data
    try {
      const response = await axios.post("http://core-api:9081/api/node", req.body.traceibility, {
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
    const config = req.body;
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);

    // Save JSON configuration to a temporary file
    const configPath = path.join(__dirname, "temp-config.json");
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

    const command = `npx concurrently \"npm run start:node\" \"sleep 15 && npx ts-mocha -p ./tsconfig.json --timeout 60000  './e2e-tests/integration/scenario-generic.test.ts'\" --kill-others --success first`;

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
      console.log("Script stderr:", stderr);

      res.status(200).send({ message: "Script executed successfully", stdout, stderr });

      // Clean up the temporary file
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
