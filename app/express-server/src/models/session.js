const mongoose = require('mongoose');

// Server-side sessions. Only a SHA-256 hash of the session token is stored, so a database
// dump cannot be replayed as live sessions. MongoDB removes expired documents via the TTL index.
const sessionSchema = new mongoose.Schema({
  tokenHash: { type: String, required: true, unique: true },
  organizationId: { type: String, required: true },
  username: { type: String, required: true },
  expiresAt: { type: Date, required: true, index: { expires: 0 } },
});

module.exports = mongoose.model('Session', sessionSchema);
