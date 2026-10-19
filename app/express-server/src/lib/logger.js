const winston = require('winston');

// Logs go to stdout (collected by Docker). Set DVCT_LOG_FILE to also write to a file.
const transports = [new winston.transports.Console()];
if (process.env.DVCT_LOG_FILE) {
  transports.push(new winston.transports.File({ filename: process.env.DVCT_LOG_FILE }));
}

module.exports = winston.createLogger({
  level: process.env.DVCT_LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf((info) => `${info.timestamp} ${info.level}: ${info.message}`),
  ),
  transports,
  silent: process.env.NODE_ENV === 'test',
});
