// Prints a scrypt hash for config/organizations.json: npm run hash-password -- '<password>'
const { hashPassword } = require('../src/lib/auth');

const password = process.argv[2];
if (!password || password.length < 12) {
  console.error('Usage: npm run hash-password -- "<password of at least 12 characters>"');
  process.exit(1);
}
console.log(hashPassword(password));
