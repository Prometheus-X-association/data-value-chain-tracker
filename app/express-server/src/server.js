const fs = require('fs');
const path = require('path');

// Local development outside Docker: read app/express-server/.env if present.
const localEnvFile = path.resolve(__dirname, '../.env');
if (fs.existsSync(localEnvFile)) {
  process.loadEnvFile(localEnvFile);
}

const app = require('./app');
const connectWithRetry = require('./config/database');
const Data = require('./models/data');
const logger = require('./lib/logger');
const { assertAuthConfiguration } = require('./lib/auth');

const port = Number(process.env.PORT || 9081);

const start = async () => {
  assertAuthConfiguration();
  await connectWithRetry();

  try {
    await Data.init();
  } catch (error) {
    logger.error(
      `Could not build the unique canonicalKey index (duplicate nodes in the database?): ${error.message}`,
    );
  }

  app.listen(port, () => {
    logger.info(`Server is running on port ${port}`);
  });
};

start().catch((error) => {
  logger.error(`Startup failed: ${error.message}`);
  process.exit(1);
});
