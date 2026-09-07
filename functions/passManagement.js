'use strict';

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { generateToken, hashToken } = require('./tokens');
const { getAppBaseUrl, sanitizeGuestPassForClient } = require('./guestPasses');

/**
 * Callable endpoint to list all guest passes for a program (§6 Task 8).
 * Restricted to administrators and instructors.
 *
 * @param {object} data { programId }
 * @param {object} context Callable context
 * @param {object} [deps] Injected dependencies for testing
 * @returns {Promise<{ passes: Array<object> }>}
 */
async function listGuestPassesHandler(data, context, deps = {}) {
  if (
    !context ||
    !context.auth ||
    (!context.auth.token?.admin && !context.auth.token?.instructor)
  ) {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Only authorized administrators or instructors may list guest passes.'
    );
  }

  const programId = data?.programId;
  if (!programId || typeof programId !== 'string' || !programId.trim()) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'A valid programId is required.'
    );
  }

  const db = deps.db || admin.firestore();
  const snapshot = await db
    .collection('guestPasses')
    .where('programId', '==', programId.trim())
    .get();

  const passes = snapshot.docs.map((doc) => {
    return sanitizeGuestPassForClient(doc.data(), doc.id);
  });

  return { passes };
}

/**
 * Callable endpoint to intentionally rotate an active pass link (§6 Task 8).
 * Invalidates all previous tokens and generates a fresh magic link while preserving pass.uid.
 *
 * @param {object} data { passId }
 * @param {object} context Callable context
 * @param {object} [deps] Injected dependencies for testing
 * @returns {Promise<{ success: boolean, passId: string, passUrl: string }>}
 */
async function rotatePassLinkHandler(data, context, deps = {}) {
  if (
    !context ||
    !context.auth ||
    (!context.auth.token?.admin && !context.auth.token?.instructor)
  ) {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Only authorized administrators or instructors may rotate pass links.'
    );
  }

  const passId = data?.passId;
  if (!passId || typeof passId !== 'string' || !passId.trim()) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'A valid passId is required.'
    );
  }

  const db = deps.db || admin.firestore();
  const baseUrl = deps.baseUrl || getAppBaseUrl();
  const now = deps.now ? deps.now() : Date.now();

  const passDocRef = db.collection('guestPasses').doc(passId.trim());
  const passSnap = await passDocRef.get();

  if (!passSnap.exists) {
    throw new functions.https.HttpsError('not-found', 'Guest pass not found.');
  }

  const passData = passSnap.data();

  // Invariant: Cannot rotate an inactive or revoked pass
  if (passData.status !== 'active') {
    throw new functions.https.HttpsError(
      'failed-precondition',
      'Cannot rotate a revoked or inactive pass.'
    );
  }

  // Generate new token & SHA-256 hash
  const rawToken = generateToken(32);
  const newTokenHash = hashToken(rawToken);

  const fv = admin.firestore.FieldValue;
  await passDocRef.update({
    tokenHash: newTokenHash,
    activeTokenHashes: [newTokenHash],
    activeTokenPool: [{ hash: newTokenHash, createdAt: now }],
    updatedAt: fv.serverTimestamp(),
  });

  const passUrl = `${baseUrl}/my/${rawToken}`;

  return {
    success: true,
    passId: passSnap.id,
    passUrl,
  };
}

/**
 * Callable endpoint to immediately revoke a guest pass (§6 Task 8).
 * Sets status: 'revoked', empties activeTokenHashes, calls revokeRefreshTokens,
 * and deletes any active occupancy session.
 *
 * @param {object} data { passId }
 * @param {object} context Callable context
 * @param {object} [deps] Injected dependencies for testing
 * @returns {Promise<{ success: boolean, passId: string }>}
 */
async function revokeGuestPassHandler(data, context, deps = {}) {
  if (
    !context ||
    !context.auth ||
    (!context.auth.token?.admin && !context.auth.token?.instructor)
  ) {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Only authorized administrators or instructors may revoke guest passes.'
    );
  }

  const passId = data?.passId;
  if (!passId || typeof passId !== 'string' || !passId.trim()) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'A valid passId is required.'
    );
  }

  const db = deps.db || admin.firestore();
  const auth = deps.auth || admin.auth();

  const passDocRef = db.collection('guestPasses').doc(passId.trim());
  const passSnap = await passDocRef.get();

  if (!passSnap.exists) {
    throw new functions.https.HttpsError('not-found', 'Guest pass not found.');
  }

  const passData = passSnap.data();
  const fv = admin.firestore.FieldValue;

  // 1. Mark pass as revoked and clear all active token hashes
  await passDocRef.update({
    status: 'revoked',
    revokedAt: fv.serverTimestamp(),
    activeTokenHashes: [],
    activeTokenPool: [],
    updatedAt: fv.serverTimestamp(),
  });

  // 2. Revoke Firebase Auth refresh tokens for this user identity
  if (passData.uid && auth.revokeRefreshTokens) {
    try {
      await auth.revokeRefreshTokens(passData.uid);
    } catch (authErr) {
      console.warn(`[Revocation] Warning revoking refresh tokens for ${passData.uid}:`, authErr.message);
    }
  }

  // 3. Clean release: delete active occupancy doc if present
  try {
    await db.collection('occupancy').doc(passSnap.id).delete();
  } catch (occErr) {
    console.warn(`[Revocation] Warning deleting occupancy for ${passSnap.id}:`, occErr.message);
  }

  return {
    success: true,
    passId: passSnap.id,
  };
}

module.exports = {
  listGuestPassesHandler,
  rotatePassLinkHandler,
  revokeGuestPassHandler,
};
