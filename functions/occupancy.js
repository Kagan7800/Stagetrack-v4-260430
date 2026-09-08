'use strict';

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { generateToken, hashToken } = require('./tokens');

const TOKEN_TTL_MS = 60 * 1000; // 60 seconds
const STALE_OCCUPANCY_MS = 45 * 1000; // 45 seconds
const TRANSFER_COOLDOWN_MS = 15 * 1000; // 15 seconds

/**
 * Helper to convert various timestamp formats to epoch milliseconds.
 */
function toEpochMillis(ts) {
  if (!ts) return 0;
  if (typeof ts.toMillis === 'function') return ts.toMillis();
  if (ts instanceof Date) return ts.getTime();
  if (typeof ts === 'number') return ts;
  if (typeof ts === 'string') return new Date(ts).getTime();
  if (typeof ts.seconds === 'number') return ts.seconds * 1000 + (ts.nanoseconds || 0) / 1e6;
  if (typeof ts._seconds === 'number') return ts._seconds * 1000 + (ts._nanoseconds || 0) / 1e6;
  return 0;
}

/**
 * Loads guestPasses/{passId} inside a transaction and rejects unless active.
 * Must be called before any transaction writes — Firestore requires all reads first.
 */
async function assertPassActive(transaction, db, passId) {
  const passRef = db.collection('guestPasses').doc(passId);
  const passDoc = await transaction.get(passRef);
  if (!passDoc.exists || passDoc.data().status !== 'active') {
    throw new functions.https.HttpsError('permission-denied', 'This pass is no longer active.');
  }
  return passDoc;
}

/**
 * Callable handler to mint a short-lived (60s), single-use join token (§5 Task 6).
 * Requires the pass holder to have an 'admitted' joinRequest for the session.
 *
 * @param {object} data { sessionId }
 * @param {object} context Callable context
 * @param {object} [deps] Injected dependencies for testing
 * @returns {Promise<{ success: boolean, joinToken: string, expiresAt: number }>}
 */
async function mintJoinTokenHandler(data, context, deps = {}) {
  // 1. Auth Gate
  if (!context || !context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'You must be signed in to request a join token.');
  }

  const passId = context.auth.token?.passId;
  const userProgramId = context.auth.token?.programId;
  const userUid = context.auth.uid;

  if (!passId || typeof passId !== 'string') {
    throw new functions.https.HttpsError('permission-denied', 'No guest pass associated with this session token.');
  }

  const sessionId = data?.sessionId;
  if (!sessionId || typeof sessionId !== 'string' || !sessionId.trim()) {
    throw new functions.https.HttpsError('invalid-argument', 'sessionId is required.');
  }

  const db = deps.db || admin.firestore();
  const now = deps.now ? deps.now() : Date.now();
  const requestId = `${sessionId.trim()}_${passId}`;
  const requestDocRef = db.collection('joinRequests').doc(requestId);

  // 2. Transactional validation, token rotation, and single active token assignment
  return await db.runTransaction(async (transaction) => {
    await assertPassActive(transaction, db, passId);
    const requestDoc = await transaction.get(requestDocRef);

    if (!requestDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Join request not found.');
    }

    const requestData = requestDoc.data();
    if (requestData.status !== 'admitted') {
      throw new functions.https.HttpsError(
        'failed-precondition',
        'You must be admitted by the instructor before obtaining a join token.'
      );
    }

    // 3. Invalidate prior active token if one exists and is unconsumed
    const priorTokenHash = requestData.activeTokenHash;
    if (priorTokenHash && typeof priorTokenHash === 'string') {
      const priorTokenRef = db.collection('joinTokens').doc(priorTokenHash);
      const priorTokenDoc = await transaction.get(priorTokenRef);
      if (priorTokenDoc.exists && priorTokenDoc.data().used !== true) {
        transaction.update(priorTokenRef, {
          used: true,
          invalidatedAt: admin.firestore.Timestamp.fromMillis(now),
          invalidationReason: 'rotated',
        });
      }
    }

    // 4. Generate raw 32-byte crypto token and SHA-256 hash
    const rawToken = generateToken(32);
    const tokenHash = hashToken(rawToken);
    const expiresAtMillis = now + TOKEN_TTL_MS;

    const tokenDocRef = db.collection('joinTokens').doc(tokenHash);
    transaction.set(tokenDocRef, {
      tokenHash,
      passId,
      sessionId: sessionId.trim(),
      uid: userUid,
      used: false,
      createdAt: admin.firestore.Timestamp.fromMillis(now),
      expiresAt: admin.firestore.Timestamp.fromMillis(expiresAtMillis),
    });

    // 5. Update active token pointer on joinRequest
    transaction.update(requestDocRef, {
      activeTokenHash: tokenHash,
      tokenMintedAt: admin.firestore.Timestamp.fromMillis(now),
    });

    return {
      success: true,
      joinToken: rawToken,
      expiresAt: expiresAtMillis,
    };
  });
}

/**
 * Callable handler to claim the live occupancy slot using a join token (§5 Task 6).
 * Transactionally consumes the token (single-use) and claims occupancy/{passId}.
 * Enforces single stream exclusivity and a 15s transfer cooldown.
 *
 * @param {object} data { sessionId, connectionId, joinToken, forceTransfer }
 * @param {object} context Callable context
 * @param {object} [deps] Injected dependencies for testing
 * @returns {Promise<{ status: 'connected' | 'occupied', connectionId?: string, currentConnectionId?: string, cooldownRemaining?: number }>}
 */
async function claimOccupancySlotHandler(data, context, deps = {}) {
  // 1. Auth Gate
  if (!context || !context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'You must be signed in to claim an occupancy slot.');
  }

  const passId = context.auth.token?.passId;
  const userUid = context.auth.uid;

  if (!passId || typeof passId !== 'string') {
    throw new functions.https.HttpsError('permission-denied', 'No guest pass associated with this session.');
  }

  const sessionId = data?.sessionId;
  const connectionId = data?.connectionId;
  const rawJoinToken = data?.joinToken;
  const forceTransfer = Boolean(data?.forceTransfer);

  if (!sessionId || typeof sessionId !== 'string' || !sessionId.trim()) {
    throw new functions.https.HttpsError('invalid-argument', 'sessionId is required.');
  }
  if (!connectionId || typeof connectionId !== 'string' || !connectionId.trim()) {
    throw new functions.https.HttpsError('invalid-argument', 'connectionId is required.');
  }
  if (!rawJoinToken || typeof rawJoinToken !== 'string' || !rawJoinToken.trim()) {
    throw new functions.https.HttpsError('invalid-argument', 'joinToken is required.');
  }

  const tokenHash = hashToken(rawJoinToken.trim());
  const db = deps.db || admin.firestore();
  const now = deps.now ? deps.now() : Date.now();

  const joinTokenRef = db.collection('joinTokens').doc(tokenHash);
  const occupancyRef = db.collection('occupancy').doc(passId);

  // 2. Transactional validation and claim
  return await db.runTransaction(async (transaction) => {
    await assertPassActive(transaction, db, passId);
    const tokenDoc = await transaction.get(joinTokenRef);
    if (!tokenDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Invalid join token.');
    }

    const tokenData = tokenDoc.data();
    if (tokenData.passId !== passId || tokenData.sessionId !== sessionId.trim()) {
      throw new functions.https.HttpsError('permission-denied', 'Join token does not match this pass or session.');
    }

    if (tokenData.used === true) {
      throw new functions.https.HttpsError('failed-precondition', 'Join token has already been used.');
    }

    const tokenExpiresMillis = toEpochMillis(tokenData.expiresAt);
    if (now > tokenExpiresMillis) {
      throw new functions.https.HttpsError('failed-precondition', 'Join token has expired.');
    }

    // Check current occupancy slot
    const occupancyDoc = await transaction.get(occupancyRef);
    if (occupancyDoc.exists) {
      const occData = occupancyDoc.data();
      const isSameSession = occData.sessionId === sessionId.trim();
      const isDifferentConn = occData.connectionId && occData.connectionId !== connectionId.trim();

      if (isSameSession && isDifferentConn) {
        const lastHeartbeatMillis = toEpochMillis(occData.heartbeatAt);
        const isHeartbeatActive = (now - lastHeartbeatMillis) < STALE_OCCUPANCY_MS;

        if (isHeartbeatActive) {
          if (!forceTransfer) {
            // Refuse second connection; offer takeover in UI
            return {
              status: 'occupied',
              currentConnectionId: occData.connectionId,
            };
          }

          // Force transfer requested: check cooldown
          const lastTransferredMillis = toEpochMillis(occData.lastTransferredAt);
          if (lastTransferredMillis && (now - lastTransferredMillis) < TRANSFER_COOLDOWN_MS) {
            const cooldownRemaining = Math.ceil((TRANSFER_COOLDOWN_MS - (now - lastTransferredMillis)) / 1000);
            throw new functions.https.HttpsError(
              'failed-precondition',
              `Transfer cooldown in effect. Please wait ${cooldownRemaining}s before transferring again.`
            );
          }
        }
      }
    }

    // Mark token as used inside the transaction
    transaction.update(joinTokenRef, {
      used: true,
      usedAt: admin.firestore.Timestamp.fromMillis(now),
    });

    // Write / update occupancy document
    const previousTransferTime = occupancyDoc.exists ? occupancyDoc.data().lastTransferredAt : null;
    const occPayload = {
      passId,
      sessionId: sessionId.trim(),
      connectionId: connectionId.trim(),
      uid: userUid,
      heartbeatAt: admin.firestore.Timestamp.fromMillis(now),
      lastTransferredAt: forceTransfer
        ? admin.firestore.Timestamp.fromMillis(now)
        : (previousTransferTime || null),
    };

    transaction.set(occupancyRef, occPayload, { merge: true });

    return {
      status: 'connected',
      connectionId: connectionId.trim(),
    };
  });
}

/**
 * Callable handler for client occupancy heartbeats (§5 Task 6).
 *
 * @param {object} data { sessionId, connectionId }
 * @param {object} context Callable context
 * @param {object} [deps] Injected dependencies for testing
 * @returns {Promise<{ status: 'active' | 'displaced' | 'not_found' }>}
 */
async function heartbeatOccupancyHandler(data, context, deps = {}) {
  if (!context || !context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Unauthenticated heartbeat.');
  }

  const passId = context.auth.token?.passId;
  if (!passId || typeof passId !== 'string') {
    throw new functions.https.HttpsError('permission-denied', 'No guest pass associated with this token.');
  }

  const connectionId = data?.connectionId;
  if (!connectionId || typeof connectionId !== 'string') {
    throw new functions.https.HttpsError('invalid-argument', 'connectionId is required.');
  }

  const db = deps.db || admin.firestore();
  const now = deps.now ? deps.now() : Date.now();

  const occupancyDocRef = db.collection('occupancy').doc(passId);
  const occupancyDoc = await occupancyDocRef.get();

  if (!occupancyDoc.exists) {
    return { status: 'not_found' };
  }

  const occData = occupancyDoc.data();
  if (occData.connectionId !== connectionId.trim()) {
    return {
      status: 'displaced',
      message: 'Session transferred to another device.',
    };
  }

  await occupancyDocRef.update({
    heartbeatAt: admin.firestore.Timestamp.fromMillis(now),
  });

  return { status: 'active' };
}

/**
 * Callable handler for clean disconnects / page unmounts (§5 Task 6).
 *
 * @param {object} data { connectionId }
 * @param {object} context Callable context
 * @param {object} [deps] Injected dependencies for testing
 * @returns {Promise<{ success: boolean }>}
 */
async function releaseOccupancySlotHandler(data, context, deps = {}) {
  if (!context || !context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Unauthenticated release request.');
  }

  const passId = context.auth.token?.passId;
  const connectionId = data?.connectionId;

  if (!passId || !connectionId) {
    return { success: false };
  }

  const db = deps.db || admin.firestore();
  const occupancyDocRef = db.collection('occupancy').doc(passId);
  const occupancyDoc = await occupancyDocRef.get();

  if (occupancyDoc.exists && occupancyDoc.data().connectionId === connectionId.trim()) {
    await occupancyDocRef.delete();
  }

  return { success: true };
}

module.exports = {
  mintJoinTokenHandler,
  claimOccupancySlotHandler,
  heartbeatOccupancyHandler,
  releaseOccupancySlotHandler,
  TOKEN_TTL_MS,
  STALE_OCCUPANCY_MS,
  TRANSFER_COOLDOWN_MS,
};
