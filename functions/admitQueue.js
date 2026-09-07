'use strict';

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { hashToken, safeHashToken } = require('./tokens');

/**
 * Server-side handler for creating/updating a join request (§5 Task 5).
 * Strictly server-determines isNewDevice and guarantees mood data is never persisted (§4.7).
 * Uses deterministic document ID `${sessionId}_${passId}` to prevent duplicates.
 *
 * @param {object} data { sessionId, adultName, childNames, sticker, borderColor, birthdayThisWeek, deviceId }
 * @param {object} context Callable context
 * @param {object} [deps] Injected dependencies for testing
 * @returns {Promise<{ success: boolean, requestId: string, isNewDevice: boolean }>}
 */
async function submitJoinRequestHandler(data, context, deps = {}) {
  // 1. Auth Gate
  if (!context || !context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'You must be signed in to join the session.');
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

  // 2. Validate Session existence, program match, and active state
  const sessionDoc = await db.collection('sessions').doc(sessionId.trim()).get();
  if (!sessionDoc.exists) {
    throw new functions.https.HttpsError('not-found', 'Session not found.');
  }

  const sessionData = sessionDoc.data();
  if (sessionData.programId !== userProgramId) {
    throw new functions.https.HttpsError('permission-denied', 'You do not belong to this session program.');
  }

  if (sessionData.state !== 'lobby_open' && sessionData.state !== 'live') {
    throw new functions.https.HttpsError(
      'failed-precondition',
      'The lobby is not currently open for this session.'
    );
  }

  // 3. Load guest pass to evaluate server-side isNewDevice flag
  const passDoc = await db.collection('guestPasses').doc(passId).get();
  if (!passDoc.exists) {
    throw new functions.https.HttpsError('not-found', 'Guest pass document not found.');
  }

  const passData = passDoc.data();
  const knownDevices = Array.isArray(passData.knownDevices) ? passData.knownDevices : [];

  // Device hash evaluation
  const rawDeviceId = typeof data?.deviceId === 'string' && data.deviceId.trim() ? data.deviceId.trim() : null;
  const deviceHash = rawDeviceId ? hashToken(rawDeviceId) : null;

  let isNewDevice = false;
  if (deviceHash) {
    isNewDevice = !knownDevices.includes(deviceHash);
    if (isNewDevice && admin.firestore.FieldValue?.arrayUnion) {
      await db.collection('guestPasses').doc(passId).update({
        knownDevices: admin.firestore.FieldValue.arrayUnion(deviceHash),
      });
    }
  }

  // 4. Clean Fields (Strictly omit mood/vibe data per §4.7)
  const adultName = typeof data?.adultName === 'string' && data.adultName.trim()
    ? data.adultName.trim()
    : (passData.adultName || 'Guest Parent');

  const childNames = Array.isArray(data?.childNames) && data.childNames.length > 0
    ? data.childNames.filter((n) => typeof n === 'string' && n.trim()).map((n) => n.trim())
    : (Array.isArray(passData.childNames) ? passData.childNames : []);

  const sticker = typeof data?.sticker === 'string' && data.sticker.trim() ? data.sticker.trim() : null;
  const borderColor = typeof data?.borderColor === 'string' && data.borderColor.trim() ? data.borderColor.trim() : null;
  const birthdayThisWeek = Boolean(data?.birthdayThisWeek);

  // Deterministic Document ID prevents duplicates on double-tap/refresh
  const requestId = `${sessionId.trim()}_${passId}`;
  const requestDocRef = db.collection('joinRequests').doc(requestId);

  const requestPayload = {
    sessionId: sessionId.trim(),
    passId,
    uid: userUid,
    adultName,
    childNames,
    sticker,
    borderColor,
    isNewDevice,
    birthdayThisWeek,
    status: 'pending',
    requestedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  await requestDocRef.set(requestPayload, { merge: true });

  return {
    success: true,
    requestId,
    isNewDevice,
  };
}

/**
 * Callable handler for instructors to admit all pending join requests for a session (§5 Task 5).
 * Uses batched writes in chunks up to 450 to scale cleanly without transaction contention.
 *
 * @param {object} data { sessionId }
 * @param {object} context Callable context
 * @param {object} [deps] Injected dependencies for testing
 * @returns {Promise<{ success: boolean, admittedCount: number }>}
 */
async function admitAllPendingHandler(data, context, deps = {}) {
  // 1. Auth Gate: Instructor or Admin only
  if (!context || !context.auth || (!context.auth.token?.instructor && !context.auth.token?.admin)) {
    throw new functions.https.HttpsError('permission-denied', 'Only instructors can admit requests.');
  }

  const sessionId = data?.sessionId;
  if (!sessionId || typeof sessionId !== 'string' || !sessionId.trim()) {
    throw new functions.https.HttpsError('invalid-argument', 'sessionId is required.');
  }

  const db = deps.db || admin.firestore();

  // 2. Query all pending requests for this session
  const pendingQuery = await db
    .collection('joinRequests')
    .where('sessionId', '==', sessionId.trim())
    .where('status', '==', 'pending')
    .get();

  if (pendingQuery.empty) {
    return { success: true, admittedCount: 0 };
  }

  // 3. Batched writes in chunks of 450 (Firestore limit is 500)
  const BATCH_SIZE = 450;
  let batch = db.batch();
  let count = 0;
  let totalAdmitted = 0;

  for (const doc of pendingQuery.docs) {
    batch.update(doc.ref, {
      status: 'admitted',
      admittedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    count++;
    totalAdmitted++;

    if (count >= BATCH_SIZE) {
      await batch.commit();
      batch = db.batch();
      count = 0;
    }
  }

  if (count > 0) {
    await batch.commit();
  }

  return {
    success: true,
    admittedCount: totalAdmitted,
  };
}

module.exports = {
  submitJoinRequestHandler,
  admitAllPendingHandler,
};
