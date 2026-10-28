const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const swaggerUi = require('swagger-ui-express');
const swaggerDocs = require('./config/swagger');
const dataRoutes = require('./routes/dataRoutes');
const logger = require('./lib/logger');

const app = express();

// The API is reached through exactly one reverse proxy (the gateway).
app.set('trust proxy', 1);
app.disable('x-powered-by');

app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));

// Browsers reach the API same-origin through the gateway. Extra origins must be listed explicitly.
const allowedOrigins = String(process.env.DVCT_CORS_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
app.use(
  cors({
    origin: (origin, callback) => callback(null, Boolean(origin) && allowedOrigins.includes(origin)),
    credentials: true,
  }),
);

app.use(express.json({ limit: '256kb' }));

if (process.env.NODE_ENV !== 'production' || process.env.DVCT_ENABLE_SWAGGER === 'true') {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));
}

app.use('/api', dataRoutes);

app.get('/', (req, res) => {
  res.send('Welcome to the PTX - Data Value Chain Tracker');
});

app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// eslint-disable-next-line no-unused-vars
app.use((error, req, res, next) => {
  if (error.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Malformed JSON body' });
  }
  if (error.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Request body too large' });
  }
  logger.error(`Unhandled error: ${error.stack || error.message}`);
  return res.status(500).json({ error: 'Internal server error' });
});

module.exports = app;
