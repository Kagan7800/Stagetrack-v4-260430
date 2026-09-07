'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  createGuestPassHandler,
  normalizeAndValidatePhone,
  sanitizeGuestPassForClient,
  getAppBaseUrl,
} = require('../guestPasses');
const { hashToken } = require('../tokens');

/**
 * In-memory mock Firestore database for unit testing.
 * Prevents test data from ever touching live Firestore instances.
 */
function createMockDb() {
  const store = new Map();
  let idCounter = 1;

  return {
    _store: store,
    collection(collectionName) {
      return {
        doc(customId) {
          const docId = customId || `pass_${idCounter++}`;
          return {
            id: docId,
            async get() {
              const data = store.get(`${collectionName}/${docId}`);
              return {
                id: docId,
                exists: !!data,
                data: () => (data ? { ...data } : undefined),
              };
            },
            async set(data) {
              // Ensure no undefined values are written (mimicking Firestore behavior)
              for (const [k, v] of Object.entries(data)) {
                if (v === undefined) {
                  throw new Error(`Firestore does not allow undefined in field: ${k}`);
                }
              }
              store.set(`${collectionName}/${docId}`, { ...data });
            },
            async update(data) {
              const current = store.get(`${collectionName}/${docId}`) || {};
              for (const [k, v] of Object.entries(data)) {
                if (v === undefined) {
                  throw new Error(`Firestore does not allow undefined in field: ${k}`);
                }
              }
              store.set(`${collectionName}/${docId}`, { ...current, ...data });
            },
          };
        },
        where(field, op, value) {
          const filters = [{ field, op, value }];
          const queryObj = {
            where(f, o, v) {
              filters.push({ field: f, op: o, value: v });
              return queryObj;
            },
            limit(n) {
              queryObj._limit = n;
              return queryObj;
            },
            async get() {
              const results = [];
              for (const [key, docData] of store.entries()) {
                if (key.startsWith(`${collectionName}/`)) {
                  const docId = key.split('/')[1];
                  const matches = filters.every((filter) => {
                    if (filter.op === '==') {
                      return docData[filter.field] === filter.value;
                    }
                    return false;
                  });
                  if (matches) {
                    results.push({
                      id: docId,
                      ref: {
                        update: async (patch) => {
                          const curr = store.get(key);
                          store.set(key, { ...curr, ...patch });
                        },
                      },
                      data: () => ({ ...docData }),
                    });
                  }
                }
              }
              const limited = queryObj._limit ? results.slice(0, queryObj._limit) : results;
              return {
                empty: limited.length === 0,
                docs: limited,
              };
            },
          };
          return queryObj;
        },
      };
    },
  };
}

test('Pass Creation — Task 2 Acceptance Tests', async (t) => {
  const testBaseUrl = 'https://app.musicfun.test';

  await t.test('Auth Gate — rejects unauthenticated and unauthorized callers', async () => {
    const db = createMockDb();

    // 1. Unauthenticated (no context or no auth)
    await assert.rejects(
      async () => {
        await createGuestPassHandler(
          { email: 'parent@example.com', programId: 'prog1' },
          null,
          { db, baseUrl: testBaseUrl }
        );
      },
      (err) => err.code === 'permission-denied'
    );

    // 2. Authenticated but regular user (no admin/instructor claim)
    await assert.rejects(
      async () => {
        await createGuestPassHandler(
          { email: 'parent@example.com', programId: 'prog1' },
          { auth: { uid: 'user123', token: {} } },
          { db, baseUrl: testBaseUrl }
        );
      },
      (err) => err.code === 'permission-denied'
    );

    // Verify 0 records created in Firestore
    assert.equal(db._store.size, 0, 'No documents should be created on failed auth');
  });

  await t.test('Successful Pass Creation — minimal response, domain pinning, raw token secrecy', async () => {
    const db = createMockDb();
    const adminContext = {
      auth: { uid: 'admin_1', token: { admin: true } },
    };

    const result = await createGuestPassHandler(
      {
        email: 'Parent.One@example.com',
        programId: 'summer-2026',
        adultName: 'Sarah Connor',
        childNames: ['John'],
      },
      adminContext,
      { db, baseUrl: testBaseUrl }
    );

    // 1. Minimal response structure (no PII echoed)
    assert.ok(result.passId, 'Must return passId');
    assert.ok(result.passUrl, 'Must return passUrl');
    assert.equal(result.email, undefined, 'Must not echo email in response');
    assert.equal(result.phone, undefined, 'Must not echo phone in response');

    // 2. URL format: pinned domain + /my/ + rawToken
    assert.ok(result.passUrl.startsWith(`${testBaseUrl}/my/`), 'URL must use pinned baseUrl');
    const rawToken = result.passUrl.split('/my/')[1];
    assert.equal(typeof rawToken, 'string');
    assert.equal(rawToken.length, 43, 'Token must be 43-char base64url string');

    // 3. Stored Firestore document inspection & Whole-document JSON serialization check
    const storedDoc = db._store.get(`guestPasses/${result.passId}`);
    assert.ok(storedDoc, 'Document must exist in Firestore');

    // Whole-document JSON check: rawToken must NOT appear anywhere in the serialized document
    const docJson = JSON.stringify(storedDoc);
    assert.equal(docJson.includes(rawToken), false, 'Raw token string must NOT appear anywhere in stored Firestore document');

    assert.ok(storedDoc.uid, 'Document must have a decoupled user identity (uid)');
    assert.ok(storedDoc.uid.startsWith('guest_'), 'uid must start with guest_ prefix');
    assert.equal(storedDoc.tokenHash, hashToken(rawToken), 'Stored tokenHash must match SHA-256 of raw token');
    assert.equal(storedDoc.email, 'parent.one@example.com', 'Email should be lowercase normalized');
    assert.equal(storedDoc.programId, 'summer-2026');
    assert.equal(storedDoc.phone, null, 'Omitted phone must be stored as null (not undefined)');
    assert.equal(storedDoc.status, 'active');
    assert.equal(storedDoc.redeemCount, 0);
  });

  await t.test('Client-Safe Projection — tokenHash is never exposed to clients', () => {
    const rawDocData = {
      tokenHash: 'a1b2c3d4e5f6',
      knownDevices: ['device_hash_1'],
      email: 'parent@example.com',
      programId: 'spring-2026',
      adultName: 'Jane',
      childNames: ['Lily'],
      status: 'active',
      redeemCount: 0,
    };

    const clientView = sanitizeGuestPassForClient(rawDocData, 'pass_123');

    assert.equal(clientView.id, 'pass_123');
    assert.equal(clientView.email, 'parent@example.com');
    assert.equal('tokenHash' in clientView, false, 'Client view must NEVER contain tokenHash');
    assert.equal('knownDevices' in clientView, false, 'Client view must NEVER contain knownDevices');
  });

  await t.test('Uniqueness — two distinct passes yield different tokens and hashes', async () => {
    const db = createMockDb();
    const instructorContext = {
      auth: { uid: 'inst_1', token: { instructor: true } },
    };

    const pass1 = await createGuestPassHandler(
      { email: 'family1@example.com', programId: 'session_a' },
      instructorContext,
      { db, baseUrl: testBaseUrl }
    );

    const pass2 = await createGuestPassHandler(
      { email: 'family2@example.com', programId: 'session_a' },
      instructorContext,
      { db, baseUrl: testBaseUrl }
    );

    assert.notEqual(pass1.passId, pass2.passId);
    assert.notEqual(pass1.passUrl, pass2.passUrl);

    const doc1 = db._store.get(`guestPasses/${pass1.passId}`);
    const doc2 = db._store.get(`guestPasses/${pass2.passId}`);
    assert.notEqual(doc1.tokenHash, doc2.tokenHash);
  });

  await t.test('Idempotency & Re-registration — rotates token on existing pass and returns usable URL', async () => {
    const db = createMockDb();
    const adminContext = {
      auth: { uid: 'admin_1', token: { admin: true } },
    };

    // First registration
    const initialPass = await createGuestPassHandler(
      { email: 'repeat@example.com', programId: 'session_b' },
      adminContext,
      { db, baseUrl: testBaseUrl }
    );

    const initialDoc = db._store.get(`guestPasses/${initialPass.passId}`);
    const initialHash = initialDoc.tokenHash;
    const initialUid = initialDoc.uid;

    // Second registration (same email + programId)
    const rotatedPass = await createGuestPassHandler(
      { email: 'repeat@example.com', programId: 'session_b' },
      adminContext,
      { db, baseUrl: testBaseUrl }
    );

    // Assert same passId and stable uid are retained (no duplicate documents)
    assert.equal(rotatedPass.passId, initialPass.passId, 'Must keep the same passId');
    assert.equal(rotatedPass.rotated, true, 'Should be marked as rotated');
    assert.ok(rotatedPass.passUrl, 'Must return a usable, fresh passUrl');
    assert.notEqual(rotatedPass.passUrl, initialPass.passUrl, 'New passUrl must have a freshly rotated token');

    // Assert tokenHash was rotated but stable uid was preserved
    const updatedDoc = db._store.get(`guestPasses/${initialPass.passId}`);
    assert.notEqual(updatedDoc.tokenHash, initialHash, 'tokenHash must be rotated');
    assert.equal(updatedDoc.uid, initialUid, 'User uid must remain stable on pass rotation');

    // Assert exactly 1 pass document exists in the store
    const passDocs = Array.from(db._store.keys()).filter((k) => k.startsWith('guestPasses/'));
    assert.equal(passDocs.length, 1, 'Exactly one pass document must exist for this family');
  });

  await t.test('E.164 Phone Handling — validates valid numbers and rejects malformed', async () => {
    const db = createMockDb();
    const adminContext = { auth: { uid: 'admin_1', token: { admin: true } } };

    // Valid E.164
    const valid = await createGuestPassHandler(
      { email: 'phone.test@example.com', programId: 'prog_p', phone: '+14045551234' },
      adminContext,
      { db, baseUrl: testBaseUrl }
    );
    const doc = db._store.get(`guestPasses/${valid.passId}`);
    assert.equal(doc.phone, '+14045551234');

    // Malformed numbers must throw invalid-argument
    const malformedInputs = ['(404) 555-1234', '4045551234', '14045551234', 'invalid-phone', '+012345'];
    for (const badPhone of malformedInputs) {
      await assert.rejects(
        async () => {
          await createGuestPassHandler(
            { email: 'bad.phone@example.com', programId: 'prog_p', phone: badPhone },
            adminContext,
            { db, baseUrl: testBaseUrl }
          );
        },
        (err) => err.code === 'invalid-argument',
        `Bad phone "${badPhone}" must throw invalid-argument`
      );
    }
  });

  await t.test('Base URL Configuration — fails fast when APP_BASE_URL is not configured', () => {
    const origEnv = process.env.APP_BASE_URL;
    try {
      delete process.env.APP_BASE_URL;
      assert.throws(
        () => getAppBaseUrl(),
        /APP_BASE_URL environment variable is required/
      );
    } finally {
      if (origEnv !== undefined) {
        process.env.APP_BASE_URL = origEnv;
      }
    }
  });

  await t.test('getMyGuestPassHandler — retrieves sanitized pass and prevents cross-user access', async () => {
    const db = createMockDb();
    const passId = 'pass_secret_123';
    db._store.set(`guestPasses/${passId}`, {
      uid: 'guest_user_123',
      tokenHash: 'super_secret_hash',
      knownDevices: ['device_hash_a'],
      programId: 'summer-2026',
      email: 'parent@example.com',
      adultName: 'Parent',
      childNames: ['Kid'],
      status: 'active',
      redeemCount: 2,
    });

    const { getMyGuestPassHandler } = require('../guestPasses');

    // 1. Unauthenticated -> unauthenticated
    await assert.rejects(
      async () => getMyGuestPassHandler({ passId }, null, { db }),
      (err) => err.code === 'unauthenticated'
    );

    // 2. Unauthorized intruder -> permission-denied
    await assert.rejects(
      async () => getMyGuestPassHandler(
        { passId },
        { auth: { uid: 'intruder_uid', token: { passId: 'other_pass' } } },
        { db }
      ),
      (err) => err.code === 'permission-denied'
    );

    // 3. Authorized pass owner -> returns sanitized pass (NO tokenHash, NO knownDevices)
    const result = await getMyGuestPassHandler(
      { passId },
      { auth: { uid: 'guest_user_123', token: { passId } } },
      { db }
    );

    assert.equal(result.id, passId);
    assert.equal(result.email, 'parent@example.com');
    assert.equal(result.tokenHash, undefined, 'tokenHash must NEVER be returned');
    assert.equal(result.knownDevices, undefined, 'knownDevices must NEVER be returned');
  });
});
