'use strict';

const crypto = require('crypto');

/**
 * Fixed-window distributed rate limiter backed by Firestore.
 *
 * Design constraints:
 * - Fixed minute window: key = <prefix>_<minuteBucket>
 * - TTL: includes expiresAt timestamp (1 hour TTL) for Firestore automatic deletion policy.
 * - Fail-open: If Firestore fails or times out, allows the request and logs loudly to
 *   prevent database hiccups from blocking legitimate parents right before sessions.
 */

const IP_LIMIT_PER_MINUTE = 20;
const GLOBAL_LIMIT_PER_MINUTE = 500;
const TTL_MS = 60 * 60 * 1000; // 1 hour

/**
 * Hashes an IP address using SHA-256 to avoid storing raw client IPs in rate limit records.
 *
 * @param {string} ip Client IP address
 * @returns {string} Hex hash of IP
 */
function hashIp(ip) {
  if (typeof ip !== 'string' || !ip.trim()) {
    return 'unknown_ip';
  }
  return crypto.createHash('sha256').update(ip.trim()).digest('hex').slice(0, 32);
}

/**
 * Evaluates whether a request exceeds the fixed-window rate limit.
 *
 * @param {string} clientIp Caller IP address
 * @param {object} db Firestore instance
 * @param {number} [currentTimeMs=Date.now()] Clock injection for deterministic testing
 * @returns {Promise<{ allowed: boolean, retryAfterSeconds?: number }>}
 */
async function checkRateLimit(clientIp, db, currentTimeMs = Date.now()) {
  const minuteBucket = Math.floor(currentTimeMs / 60000);
  const ipHash = hashIp(clientIp);
  const expiresAt = new Date(currentTimeMs + TTL_MS);

  const ipDocId = `ip_${ipHash}_${minuteBucket}`;
  const globalDocId = `global_${minuteBucket}`;

  try {
    const rateLimitsCol = db.collection('rateLimits');
    const ipDocRef = rateLimitsCol.doc(ipDocId);
    const globalDocRef = rateLimitsCol.doc(globalDocId);

    // Atomically increment counter in transaction or batch
    const result = await db.runTransaction(async (transaction) => {
      const [ipDocSnap, globalDocSnap] = await Promise.all([
        transaction.get(ipDocRef),
        transaction.get(globalDocRef),
      ]);

      const currentIpCount = ipDocSnap.exists ? (ipDocSnap.data().count || 0) : 0;
      const currentGlobalCount = globalDocSnap.exists ? (globalDocSnap.data().count || 0) : 0;

      if (currentIpCount >= IP_LIMIT_PER_MINUTE || currentGlobalCount >= GLOBAL_LIMIT_PER_MINUTE) {
        return { allowed: false, retryAfterSeconds: 60 };
      }

      // Record increment
      transaction.set(
        ipDocRef,
        {
          count: currentIpCount + 1,
          ipHash,
          minuteBucket,
          expiresAt,
        },
        { merge: true }
      );

      transaction.set(
        globalDocRef,
        {
          count: currentGlobalCount + 1,
          minuteBucket,
          expiresAt,
        },
        { merge: true }
      );

      return { allowed: true };
    });

    return result;
  } catch (err) {
    // Fail Open: availability takes precedence over strict rate limiting during database blips
    console.error(
      '[RateLimiter] Firestore rate limit check failed - failing open to preserve availability:',
      err.message || err
    );
    return { allowed: true };
  }
}

module.exports = {
  checkRateLimit,
  hashIp,
  IP_LIMIT_PER_MINUTE,
  GLOBAL_LIMIT_PER_MINUTE,
};
