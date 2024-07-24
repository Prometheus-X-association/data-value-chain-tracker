const express = require('express');
const bodyParser = require('body-parser');
const swaggerUi = require('swagger-ui-express');
const swaggerDocs = require('./config/swagger');
const connectWithRetry = require('./config/database');
const dataRoutes = require('./routes/dataRoutes');

const app = express();
const port = 3000;

// Connect to MongoDB
connectWithRetry();

// Middleware to parse JSON
app.use(bodyParser.json());

// Swagger setup
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

// Use API routes
app.use('/api', dataRoutes);

// Home route
app.get('/', (req, res) => {
  res.send('Welcome to the PTX - Data Value Chain Tracker');
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
