'use strict';

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { generateToken, hashToken } = require('./tokens');

/**
 * Validates and normalizes an optional E.164 phone number.
 *
 * @param {unknown} phone Raw phone input
 * @returns {string|null} Normalized E.164 string or null if omitted
 * @throws {functions.https.HttpsError} If phone is provided but malformed
 */
function normalizeAndValidatePhone(phone) {
  if (phone === undefined || phone === null || phone === '') {
    return null;
  }

  if (typeof phone !== 'string') {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Phone must be a string in E.164 format (e.g. +14045551234)'
    );
  }

  const trimmed = phone.trim();
  if (!trimmed) {
    return null;
  }

  // E.164 shape: + followed by country code and 6-14 digits
  const e164Regex = /^\+[1-9]\d{6,14}$/;
  if (!e164Regex.test(trimmed)) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Phone must be in valid E.164 format (e.g. +14045551234)'
    );
  }

  return trimmed;
}

/**
 * Resolves the application base URL from environment configuration.
 * Fails fast if unset to prevent silent deployment errors or dead links.
 *
 * @returns {string} Application base URL without trailing slash
 */
function getAppBaseUrl() {
  const baseUrl = process.env.APP_BASE_URL;
  if (!baseUrl || typeof baseUrl !== 'string' || !baseUrl.trim()) {
    throw new Error(
      'APP_BASE_URL environment variable is required but not configured. Set APP_BASE_URL to your canonical domain.'
    );
  }
  return baseUrl.trim().replace(/\/+$/, '');
}

/**
 * Strips server-only security fields (tokenHash, knownDevices) for client delivery.
 *
 * @param {object} passData Raw Firestore document data
 * @param {string} passId Document ID
 * @returns {object} Client-safe guest pass representation
 */
function sanitizeGuestPassForClient(passData, passId) {
  if (!passData) return null;
  const { tokenHash, knownDevices, ...clientSafe } = passData;
  return {
    id: passId,
    ...clientSafe,
  };
}

/**
 * Core handler for creating or rotating a guest pass.
 *
 * @param {object} data Request payload { email, programId, phone?, adultName?, childNames? }
 * @param {object} context Callable context containing auth credentials
 * @param {object} [deps] Injected dependencies for testing (db, baseUrl)
 * @returns {Promise<{ passId: string, passUrl: string, rotated?: boolean }>}
 */
async function createGuestPassHandler(data, context, deps = {}) {
  // 1. Strict Auth Gate: Admin or Instructor custom claim required
  if (
    !context ||
    !context.auth ||
    (!context.auth.token?.admin && !context.auth.token?.instructor)
  ) {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Only authorized administrators or instructors may create guest passes.'
    );
  }

  // 2. Validate required fields
  const email = data?.email;
  const programId = data?.programId;

  if (typeof email !== 'string' || !email.trim() || !email.includes('@')) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'A valid email address is required.'
    );
  }

  if (typeof programId !== 'string' || !programId.trim()) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'A valid programId is required.'
    );
  }

  const normalizedEmail = email.trim().toLowerCase();
  const normalizedProgramId = programId.trim();
  const phone = normalizeAndValidatePhone(data?.phone);
  const adultName = typeof data?.adultName === 'string' && data.adultName.trim() ? data.adultName.trim() : null;
  const childNames = Array.isArray(data?.childNames)
    ? data.childNames.filter((name) => typeof name === 'string' && name.trim()).map((n) => n.trim())
    : [];

  const db = deps.db || admin.firestore();
  const baseUrl = deps.baseUrl || getAppBaseUrl();

  // 3. Generate raw token (32 bytes entropy) and SHA-256 hash
  const rawToken = generateToken(32);
  const tokenHash = hashToken(rawToken);

  // 4. Idempotency check: Search for existing active pass for (email, programId)
  const existingPassQuery = await db
    .collection('guestPasses')
    .where('email', '==', normalizedEmail)
    .where('programId', '==', normalizedProgramId)
    .where('status', '==', 'active')
    .limit(1)
    .get();

  let passId;
  let isRotated = false;

  if (!existingPassQuery.empty) {
    // Rotate: update tokenHash on the existing active pass document (preserving stable uid)
    const existingDoc = existingPassQuery.docs[0];
    passId = existingDoc.id;
    isRotated = true;

    await existingDoc.ref.update({
      tokenHash,
      phone,
      adultName,
      childNames,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  } else {
    // Create new pass document with a persistent, decoupled user identity (uid)
    const newDocRef = db.collection('guestPasses').doc();
    passId = newDocRef.id;
    const uid = `guest_${generateToken(16)}`;

    await newDocRef.set({
      uid,
      tokenHash,
      programId: normalizedProgramId,
      email: normalizedEmail,
      phone,
      adultName,
      childNames,
      status: 'active',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      lastRedeemedAt: null,
      redeemCount: 0,
      knownDevices: [],
    });
  }

  // 5. Construct URL with raw token and return minimal payload (PII omitted)
  const passUrl = `${baseUrl}/my/${rawToken}`;

  const response = {
    passId,
    passUrl,
  };

  if (isRotated) {
    response.rotated = true;
  }

  return response;
}

/**
 * Callable handler to retrieve sanitized guest pass details for an authenticated parent (§7).
 * Strictly strips tokenHash and server-only fields before returning.
 *
 * @param {object} data Optional custom passId
 * @param {object} context Callable context
 * @param {object} [deps] Injected dependencies for testing
 * @returns {Promise<object>} Sanitized client-safe guest pass
 */
async function getMyGuestPassHandler(data, context, deps = {}) {
  if (!context || !context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'You must be signed in to retrieve your guest pass.'
    );
  }

  const passId = data?.passId || context.auth.token?.passId;
  if (!passId || typeof passId !== 'string') {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'passId is missing or invalid.'
    );
  }

  const db = deps.db || admin.firestore();
  const passDoc = await db.collection('guestPasses').doc(passId.trim()).get();

  if (!passDoc.exists) {
    throw new functions.https.HttpsError('not-found', 'Guest pass not found.');
  }

  const passData = passDoc.data();

  // Verify ownership: caller must own this pass (or be instructor/admin)
  const isOwner = context.auth.token?.passId === passDoc.id || context.auth.uid === passData.uid;
  const isPrivileged = context.auth.token?.admin === true || context.auth.token?.instructor === true;

  if (!isOwner && !isPrivileged) {
    throw new functions.https.HttpsError(
      'permission-denied',
      'You do not have access to this pass.'
    );
  }

  return sanitizeGuestPassForClient(passData, passDoc.id);
}

module.exports = {
  createGuestPassHandler,
  getMyGuestPassHandler,
  normalizeAndValidatePhone,
  getAppBaseUrl,
  sanitizeGuestPassForClient,
};
