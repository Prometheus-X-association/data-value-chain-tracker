import express from "express";
import { exec } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import concurrently from "concurrently";
import Mocha from "mocha";
const app = express();
const PORT = 3000;

// Middleware to parse JSON requests
app.use(express.json());

// Endpoint to trigger the test script
app.post("/run-script", async (req, res) => {
  try {
    const config = req.body;
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    // Save JSON configuration to a temporary file

    const configPath = path.join(__dirname, "temp-config.json");
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

    const scriptPath = path.join(__dirname, "../../e2e-tests/integration/scenario-1.test.ts");
    const command = `npx concurrently \"npm run start:node\" \"sleep 5 && npx ts-mocha -p ./tsconfig.json --timeout 60000  'e2e-tests/integration/scenario-generic.test.ts'\" --kill-others --success first`;

    const execOptions = {
      env: {
        ...process.env, // inherit the current environment variables
        CONFIG_FILE: configPath, // add your custom environment variable
      },
    };


    exec(command, execOptions, (error, stdout, stderr) => {
      if (error) {
        console.error("Error executing script:", error);
        console.log("stdout:", stdout);  // Add this to print the output
        console.log("stderr:", stderr);  // Add this to print the error output
        res.status(500).send({
          message: "Error executing script",
          error: error.message,
          stdout,
          stderr
        });
        return;
      }
    
      console.log("Script stdout:", stdout);
      console.log("Script stderr:", stderr);
    
      // Send back the script output
      res.status(200).send({
        message: "Script executed successfully",
        stdout,
        stderr,
      });
    
      // Clean up the temporary file
      fs.unlinkSync(configPath);
    });
  } catch (err) {
    console.error("Error:", err);
    res.status(500).send({
      message: "Failed to execute script",
      error: err.message,
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
