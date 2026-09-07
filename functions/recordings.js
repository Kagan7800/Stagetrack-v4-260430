'use strict';

const functions = require('firebase-functions');
const admin = require('firebase-admin');

/**
 * Mints short-lived signed Cloud Storage URLs for session recordings (§4.8).
 * Never exposes durable public URLs.
 *
 * @param {object} data { sessionId }
 * @param {object} context Callable context
 * @param {object} [deps] Injected dependencies for testing (db, storage, now)
 * @returns {Promise<{ signedUrl: string, expiresAt: number }>}
 */
async function getRecordingSignedUrlHandler(data, context, deps = {}) {
  // 1. Auth Gate
  if (!context || !context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'You must be signed in to access session recordings.'
    );
  }

  const sessionId = data?.sessionId;
  if (typeof sessionId !== 'string' || !sessionId.trim()) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'sessionId is required.'
    );
  }

  const db = deps.db || admin.firestore();
  const storage = deps.storage || admin.storage();
  const clockNow = deps.now ? deps.now() : Date.now();

  // 2. Fetch session document
  const sessionDoc = await db.collection('sessions').doc(sessionId.trim()).get();
  if (!sessionDoc.exists) {
    throw new functions.https.HttpsError(
      'not-found',
      'Session not found.'
    );
  }

  const session = sessionDoc.data();

  // 3. Authorization: Caller's programId claim must match session programId (or be admin/instructor)
  const userProgramId = context.auth.token?.programId;
  const isAdmin = context.auth.token?.admin === true;
  const isInstructor = context.auth.token?.instructor === true;

  if (!isAdmin && !isInstructor && (!userProgramId || userProgramId !== session.programId)) {
    throw new functions.https.HttpsError(
      'permission-denied',
      'You do not have access to recordings for this program.'
    );
  }

  // 4. Verify recording availability & expiration window
  if (!session.recordingPath || typeof session.recordingPath !== 'string') {
    throw new functions.https.HttpsError(
      'failed-precondition',
      'No recording is available for this session yet.'
    );
  }

  const recordingExpires = session.recordingExpires
    ? (typeof session.recordingExpires.toMillis === 'function'
      ? session.recordingExpires.toMillis()
      : Number(session.recordingExpires))
    : null;

  if (recordingExpires && clockNow > recordingExpires) {
    throw new functions.https.HttpsError(
      'deadline-exceeded',
      'The recording for this session has expired.'
    );
  }

  // 5. Mint short-lived signed URL (30 minutes expiry)
  const expiresAt = clockNow + 30 * 60 * 1000;
  const bucket = storage.bucket();
  const file = bucket.file(session.recordingPath);

  const [signedUrl] = await file.getSignedUrl({
    action: 'read',
    expires: expiresAt,
  });

  return {
    signedUrl,
    expiresAt,
  };
}

module.exports = {
  getRecordingSignedUrlHandler,
};
