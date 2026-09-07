'use strict';

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { FieldValue } = require('firebase-admin/firestore');
const sgMail = require('@sendgrid/mail');
const { generateToken, hashToken, safeHashToken } = require('./tokens');

const MAX_RECOVERIES_PER_CONTACT_HOUR = 3;
const MAX_RECOVERIES_PER_IP_MINUTE = 10;
const GENERIC_RECOVERY_MESSAGE = "If a pass is associated with that contact, we've sent your access link.";

/**
 * Normalizes user contact input and detects whether it is an email or phone number.
 *
 * @param {string} input Raw user contact input
 * @returns {{ type: 'email' | 'phone' | 'invalid', contact: string | null }}
 */
function detectAndNormalizeContact(input) {
  if (!input || typeof input !== 'string') {
    return { type: 'invalid', contact: null };
  }

  const trimmed = input.trim();
  if (!trimmed) {
    return { type: 'invalid', contact: null };
  }

  // 1. Email detection
  if (trimmed.includes('@')) {
    const normalizedEmail = trimmed.toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (emailRegex.test(normalizedEmail)) {
      return { type: 'email', contact: normalizedEmail };
    }
    return { type: 'invalid', contact: null };
  }

  // 2. Phone detection & E.164 normalization
  // Strip non-digit characters except leading plus
  let digits = trimmed.replace(/[^\d+]/g, '');
  if (digits.startsWith('+')) {
    digits = '+' + digits.replace(/[^\d]/g, '');
  } else if (/^\d{10}$/.test(digits)) {
    // 10-digit US number -> +1XXXXXXXXXX
    digits = '+1' + digits;
  } else if (/^1\d{10}$/.test(digits)) {
    // 11-digit US number with country code -> +1XXXXXXXXXX
    digits = '+' + digits;
  }

  const e164Regex = /^\+[1-9]\d{6,14}$/;
  if (e164Regex.test(digits)) {
    return { type: 'phone', contact: digits };
  }

  return { type: 'invalid', contact: null };
}

/**
 * Helper to check rate limits for pass recovery.
 *
 * @param {string} key Rate limit identifier
 * @param {number} maxAttempts Maximum allowed attempts
 * @param {number} windowSeconds Window duration in seconds
 * @param {object} db Firestore instance
 * @param {number} now Epoch milliseconds
 * @returns {Promise<boolean>} true if allowed, false if limit exceeded
 */
async function checkRecoveryRateLimit(key, maxAttempts, windowSeconds, db, now) {
  const windowMs = windowSeconds * 1000;
  const currentWindow = Math.floor(now / windowMs);
  const docId = `recovery_${key}_${currentWindow}`;
  const docRef = db.collection('rateLimits').doc(docId);

  try {
    const fv = FieldValue || admin.firestore.FieldValue;
    const expiresAt = new Date(now + windowMs + 3600 * 1000);

    let allowed = true;
    await db.runTransaction(async (transaction) => {
      const snap = await transaction.get(docRef);
      const currentCount = snap.exists ? (snap.data().count || 0) : 0;

      if (currentCount >= maxAttempts) {
        allowed = false;
        return;
      }

      if (snap.exists) {
        transaction.update(docRef, { count: fv.increment(1) });
      } else {
        transaction.set(docRef, {
          count: 1,
          createdAt: fv.serverTimestamp(),
          expiresAt: admin.firestore.Timestamp.fromDate(expiresAt),
        });
      }
    });

    return allowed;
  } catch (err) {
    console.warn('[RecoveryRateLimiter] Error during check, failing open:', err.message);
    return true;
  }
}

/**
 * Callable function to recover a passwordless access link (§5 Task 7).
 * Identical response regardless of whether contact exists.
 * Non-destructive token pool preserves existing bookmarks across devices.
 * Strict refusal on revoked passes.
 *
 * @param {object} data { contact }
 * @param {object} context Callable context
 * @param {object} [deps] Injected dependencies for testing
 * @returns {Promise<{ success: boolean, message: string }>}
 */
async function recoverGuestPassHandler(data, context, deps = {}) {
  const rawContact = data?.contact;
  const db = deps.db || admin.firestore();
  const now = deps.now ? deps.now() : Date.now();
  const clientIp = context?.rawRequest?.ip || '127.0.0.1';

  // 1. IP Rate limit check (10/min)
  const ipKey = safeHashToken(clientIp) || 'ip_anon';
  const ipAllowed = await checkRecoveryRateLimit(`ip_${ipKey}`, MAX_RECOVERIES_PER_IP_MINUTE, 60, db, now);
  if (!ipAllowed) {
    throw new functions.https.HttpsError(
      'resource-exhausted',
      'Too many recovery attempts from this network. Please wait a moment.'
    );
  }

  // 2. Parse & Normalize Contact
  const { type, contact } = detectAndNormalizeContact(rawContact);
  if (type === 'invalid' || !contact) {
    // Return identical message without leaking invalid format
    return { success: true, message: GENERIC_RECOVERY_MESSAGE };
  }

  // 3. Contact Rate limit check (3/hour)
  const contactKey = safeHashToken(contact);
  const contactAllowed = await checkRecoveryRateLimit(`contact_${contactKey}`, MAX_RECOVERIES_PER_CONTACT_HOUR, 3600, db, now);
  if (!contactAllowed) {
    throw new functions.https.HttpsError(
      'resource-exhausted',
      'Too many recovery requests for this contact. Please check your messages or try again in an hour.'
    );
  }

  // 4. Look up active pass
  try {
    let passQuery;
    if (type === 'email') {
      passQuery = await db
        .collection('guestPasses')
        .where('email', '==', contact)
        .where('status', '==', 'active')
        .limit(1)
        .get();
    } else {
      passQuery = await db
        .collection('guestPasses')
        .where('phone', '==', contact)
        .where('status', '==', 'active')
        .limit(1)
        .get();
    }

    if (passQuery.empty) {
      // Timing equalization dummy write (noop)
      const { queueDelivery } = require('./delivery');
      try {
        await queueDelivery({ type: 'noop', status: 'noop', db, now: () => now });
      } catch (_) {}
      return { success: true, message: GENERIC_RECOVERY_MESSAGE };
    }

    const passDoc = passQuery.docs[0];
    const passData = passDoc.data();

    // Invariant check: Ensure pass is active (status is single source of truth)
    if (passData.status !== 'active') {
      const { queueDelivery } = require('./delivery');
      try {
        await queueDelivery({ type: 'noop', status: 'noop', db, now: () => now });
      } catch (_) {}
      return { success: true, message: GENERIC_RECOVERY_MESSAGE };
    }

    // 5. Generate fresh recovery token & append to activeTokenPool / activeTokenHashes
    const recoveryToken = generateToken(32);
    const recoveryTokenHash = hashToken(recoveryToken);
    const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;
    const POOL_CAP = 10;

    // Support structured activeTokenPool: [{ hash, createdAt }] or legacy activeTokenHashes: [hash]
    let currentPool = [];
    if (Array.isArray(passData.activeTokenPool) && passData.activeTokenPool.length > 0) {
      currentPool = passData.activeTokenPool;
    } else if (Array.isArray(passData.activeTokenHashes) && passData.activeTokenHashes.length > 0) {
      currentPool = passData.activeTokenHashes.map((h) => ({ hash: h, createdAt: now }));
    } else if (passData.tokenHash) {
      currentPool = [{ hash: passData.tokenHash, createdAt: now }];
    }

    // Filter out expired tokens (>90 days old)
    const validPool = currentPool.filter((item) => {
      if (!item || !item.hash) return false;
      if (typeof item.createdAt === 'number') {
        return (now - item.createdAt) <= NINETY_DAYS_MS;
      }
      return true;
    });

    // Add new token
    validPool.push({ hash: recoveryTokenHash, createdAt: now });

    // Cap pool at 10 most recent entries
    const cappedPool = validPool.slice(-POOL_CAP);
    const updatedTokenHashes = cappedPool.map((item) => item.hash);

    const fv = FieldValue || admin.firestore.FieldValue;
    await passDoc.ref.update({
      activeTokenHashes: updatedTokenHashes,
      activeTokenPool: cappedPool,
      lastRecoveredAt: fv.serverTimestamp(),
    });

    // 6. Enqueue delivery to deliveryQueue (processed by background trigger)
    const baseUrl = (process.env.APP_BASE_URL || 'http://127.0.0.1:5000').replace(/\/+$/, '');
    const magicLink = `${baseUrl}/my/${recoveryToken}`;
    const { queueDelivery } = require('./delivery');

    try {
      await queueDelivery({
        passId: passDoc.id,
        type,
        contact,
        passUrl: magicLink,
        adultName: passData.adultName,
        db,
        now: () => now,
      });
    } catch (queueErr) {
      console.warn('[Recovery] Delivery queue warning:', queueErr.message);
    }

    return { success: true, message: GENERIC_RECOVERY_MESSAGE };
  } catch (err) {
    console.error('[Recovery] Internal error during pass recovery:', err);
    return { success: true, message: GENERIC_RECOVERY_MESSAGE };
  }
}

module.exports = {
  detectAndNormalizeContact,
  recoverGuestPassHandler,
  GENERIC_RECOVERY_MESSAGE,
};
