const mongoose = require('mongoose');
const logger = require('../lib/logger');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/jsonldDB';

const connectWithRetry = async () => {
  for (;;) {
    try {
      await mongoose.connect(MONGODB_URI);
      logger.info('MongoDB is connected');
      return;
    } catch (error) {
      logger.warn(`MongoDB connection unsuccessful, retrying in 5 seconds: ${error.message}`);
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }
};

module.exports = connectWithRetry;
