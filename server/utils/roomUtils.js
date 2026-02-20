const crypto = require('crypto');

/**
 * Generates a cryptographically random 8-character hex room ID.
 * Collision chance is negligible (2^32 space per generation).
 */
const generateRoomId = () => {
  return crypto.randomBytes(4).toString('hex').toUpperCase();
};

module.exports = { generateRoomId };