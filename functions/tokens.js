'use strict';

const crypto = require('crypto');

/**
 * Token utilities for passwordless guest access.
 *
 * Design constraints:
 * - Exact byte comparison: No trimming, case-folding, or Unicode normalization.
 *   Tokens are treated as raw opaque strings. URL-decoding is strictly the caller's responsibility.
 * - Minimum entropy: Default 32 bytes (256 bits), floor 16 bytes (128 bits).
 * - Safe storage: Raw tokens are NEVER stored. Only SHA-256 hex hashes are persisted.
 */

/**
 * Generates a cryptographically secure random token.
 * Default entropy is 32 bytes (256 bits), producing a 43-character base64url string.
 * Floor is 16 bytes (128 bits).
 *
 * @param {number} [byteLength=32] Number of random bytes (default: 32, minimum: 16)
 * @returns {string} Base64url-encoded random token
 */
function generateToken(byteLength = 32) {
  const bytes = Math.max(16, typeof byteLength === 'number' && !Number.isNaN(byteLength) ? byteLength : 32);
  return crypto.randomBytes(bytes).toString('base64url');
}

/**
 * Hashes a raw token using SHA-256 and returns the hex digest.
 * Rejects non-string, empty, null, or undefined input with a TypeError.
 * Never stores or returns the raw token.
 *
 * @param {string} raw Raw token string (non-empty)
 * @returns {string} SHA-256 hex digest (64 characters)
 */
function hashToken(raw) {
  if (typeof raw !== 'string' || raw.length === 0) {
    throw new TypeError('Token to hash must be a non-empty string');
  }
  return crypto.createHash('sha256').update(raw).digest('hex');
}

/**
 * Safe version of hashToken for external boundaries (e.g. HTTP parameters).
 * Returns null instead of throwing if the input is empty, non-string, or malformed.
 *
 * @param {unknown} raw Untrusted input from request
 * @returns {string|null} SHA-256 hex digest (64 chars) or null if invalid
 */
function safeHashToken(raw) {
  if (typeof raw !== 'string' || raw.length === 0) {
    return null;
  }
  return crypto.createHash('sha256').update(raw).digest('hex');
}

/**
 * Verifies a candidate raw token against a stored SHA-256 hex hash using constant-time comparison.
 * Rejects non-string, empty, null, or undefined input up front and returns false.
 * Performs byte-exact comparison without any normalization or trimming.
 *
 * @param {string} raw Candidate raw token
 * @param {string} storedHash Stored hex hash from the database
 * @returns {boolean} True if matching, false otherwise
 */
function verifyToken(raw, storedHash) {
  const candidateHash = safeHashToken(raw);
  if (!candidateHash || typeof storedHash !== 'string' || storedHash.length === 0) {
    return false;
  }

  const candidateBuf = Buffer.from(candidateHash, 'hex');
  const storedBuf = Buffer.from(storedHash, 'hex');

  // SHA-256 produces exactly 32 bytes (64 hex characters)
  if (candidateBuf.length !== 32 || storedBuf.length !== 32) {
    return false;
  }

  return crypto.timingSafeEqual(candidateBuf, storedBuf);
}

module.exports = {
  generateToken,
  hashToken,
  safeHashToken,
  verifyToken,
};
