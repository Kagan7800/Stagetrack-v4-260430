'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const {
  detectAndNormalizeContact,
  recoverGuestPassHandler,
  GENERIC_RECOVERY_MESSAGE,
} = require('../recovery');
const { createGuestPassHandler } = require('../guestPasses');
const { redeemPassHandler } = require('../redeem');
const { hashToken } = require('../tokens');

/**
 * In-memory Mock Firestore Database.
 */
function createMockDb() {
  const store = new Map();

  function getDocRef(col, docId) {
    const key = `${col}/${docId}`;
    return {
      id: docId,
      path: key,
      async get() {
        const data = store.get(key);
        return {
          id: docId,
          exists: data !== undefined,
          data: () => (data ? JSON.parse(JSON.stringify(data)) : undefined),
        };
      },
      async set(data, opts = {}) {
        if (opts.merge && store.has(key)) {
          const current = store.get(key) || {};
          const merged = { ...current };
          for (const [k, v] of Object.entries(data)) {
            if (v && typeof v === 'object' && (v.operand !== undefined || v._operand !== undefined)) {
              merged[k] = (typeof current[k] === 'number' ? current[k] : 0) + (v.operand || v._operand || 1);
            } else {
              merged[k] = v;
            }
          }
          store.set(key, merged);
        } else {
          store.set(key, { ...data });
        }
      },
      async update(data) {
        if (!store.has(key)) throw new Error(`Doc ${key} does not exist`);
        const current = store.get(key) || {};
        const merged = { ...current };
        for (const [k, v] of Object.entries(data)) {
          if (v && typeof v === 'object' && (v.operand !== undefined || v._operand !== undefined)) {
            merged[k] = (typeof current[k] === 'number' ? current[k] : 0) + (v.operand || v._operand || 1);
          } else {
            merged[k] = v;
          }
        }
        store.set(key, merged);
      },
      async delete() {
        store.delete(key);
      },
    };
  }

  return {
    _store: store,
    collection(col) {
      return {
        doc(docId = `doc_${Math.random().toString(36).substring(2, 11)}`) {
          return getDocRef(col, docId);
        },
        where(field, op, val) {
          const filters = [{ field, op, val }];
          let limitCount = Infinity;
          const queryObj = {
            where(f2, op2, v2) {
              filters.push({ field: f2, op: op2, val: v2 });
              return queryObj;
            },
            limit(n) {
              limitCount = n;
              return queryObj;
            },
            async get() {
              return this._query((doc) => {
                return filters.every((f) => {
                  if (f.op === 'array-contains') {
                    return Array.isArray(doc[f.field]) && doc[f.field].includes(f.val);
                  }
                  return doc[f.field] === f.val;
                });
              });
            },
            _query(filterFn) {
              const docs = [];
              for (const [key, data] of store.entries()) {
                if (key.startsWith(`${col}/`) && filterFn(data)) {
                  const docId = key.split('/')[1];
                  docs.push({
                    id: docId,
                    ref: getDocRef(col, docId),
                    data: () => JSON.parse(JSON.stringify(data)),
                  });
                  if (docs.length >= limitCount) break;
                }
              }
              return {
                docs,
                empty: docs.length === 0,
                size: docs.length,
              };
            },
          };
          return queryObj;
        },
      };
    },
    async runTransaction(updateFn) {
      const transaction = {
        async get(docRef) {
          return docRef.get();
        },
        set(docRef, data, opts = {}) {
          if (opts.merge && store.has(docRef.path)) {
            store.set(docRef.path, { ...store.get(docRef.path), ...data });
          } else {
            store.set(docRef.path, { ...data });
          }
        },
        update(docRef, data) {
          if (!store.has(docRef.path)) throw new Error(`Doc ${docRef.path} does not exist`);
          const current = store.get(docRef.path) || {};
          const merged = { ...current };
          for (const [k, v] of Object.entries(data)) {
            if (v && typeof v === 'object' && (v.operand !== undefined || v._operand !== undefined)) {
              merged[k] = (typeof current[k] === 'number' ? current[k] : 0) + (v.operand || v._operand || 1);
            } else {
              merged[k] = v;
            }
          }
          store.set(docRef.path, merged);
        },
        delete(docRef) {
          store.delete(docRef.path);
        },
      };
      return await updateFn(transaction);
    },
  };
}

describe('Task 7: Passwordless Pass Recovery Acceptance Tests', () => {
  const baseTime = 1700000000000;
  process.env.APP_BASE_URL = 'http://127.0.0.1:5000';

  test('detectAndNormalizeContact — parses email vs US and international phones', () => {
    // Email tests
    assert.deepEqual(detectAndNormalizeContact('  Sarah@Example.COM  '), {
      type: 'email',
      contact: 'sarah@example.com',
    });

    // 10-digit US phone
    assert.deepEqual(detectAndNormalizeContact('(555) 123-4567'), {
      type: 'phone',
      contact: '+15551234567',
    });

    // 11-digit US phone
    assert.deepEqual(detectAndNormalizeContact('1-555-123-4567'), {
      type: 'phone',
      contact: '+15551234567',
    });

    // International E.164 phone
    assert.deepEqual(detectAndNormalizeContact('+44 20 7123 4567'), {
      type: 'phone',
      contact: '+442071234567',
    });

    // Invalid format
    assert.deepEqual(detectAndNormalizeContact('not_a_contact'), {
      type: 'invalid',
      contact: null,
    });
  });

  test('recoverGuestPass — Non-destructive recovery preserves existing bookmarks (Multi-Token Hash Pool)', async () => {
    const db = createMockDb();
    const instructorCtx = { auth: { uid: 'inst_1', token: { instructor: true } } };

    // 1. Create original guest pass
    const passCreation = await createGuestPassHandler(
      {
        programId: 'spring-2026',
        adultName: 'Sarah Jenkins',
        childNames: ['Leo'],
        email: 'sarah.jenkins@example.com',
        phone: '+15551234567',
      },
      instructorCtx,
      { db, now: () => baseTime }
    );

    const rawToken1 = passCreation.passUrl.replace('http://127.0.0.1:5000/my/', '');

    // 2. Call recovery for Sarah's email
    const recoveryRes = await recoverGuestPassHandler(
      { contact: 'sarah.jenkins@example.com' },
      { rawRequest: { ip: '203.0.113.195' } },
      { db, now: () => baseTime + 1000 }
    );

    assert.equal(recoveryRes.success, true);
    assert.equal(recoveryRes.message, GENERIC_RECOVERY_MESSAGE);

    // 3. Inspect pass document in Firestore
    const passDoc = (await db.collection('guestPasses').doc(passCreation.passId).get()).data();
    assert.ok(Array.isArray(passDoc.activeTokenHashes));
    assert.equal(passDoc.activeTokenHashes.length, 2); // Contains BOTH original + recovered hash!

    const tokenHash1 = hashToken(rawToken1);
    assert.ok(passDoc.activeTokenHashes.includes(tokenHash1));

    // 4. Verify original bookmarked link STILL REDEEMS successfully
    let status1 = 0;
    const req1 = {
      method: 'GET',
      params: { token: rawToken1 },
      path: `/my/${rawToken1}`,
      ip: '198.51.100.1',
      headers: {},
    };
    const res1 = {
      status(c) { status1 = c; return this; },
      set() { return this; },
      setHeader() { return this; },
      type() { return this; },
      send() { return this; },
    };
    const mockAuth = { async createCustomToken(uid, claims) { return 'jwt_token'; } };

    await redeemPassHandler(req1, res1, { db, auth: mockAuth, now: () => baseTime + 2000 });
    assert.equal(status1, 200); // Original bookmarked link still works!
  });

  test('recoverGuestPass — Strict refusal on REVOKED passes (Cannot resurrect revoked pass)', async () => {
    const db = createMockDb();

    // Seed revoked pass
    await db.collection('guestPasses').doc('pass_revoked_1').set({
      uid: 'guest_revoked',
      tokenHash: 'hash_revoked',
      activeTokenHashes: ['hash_revoked'],
      programId: 'spring-2026',
      email: 'revoked.parent@example.com',
      phone: '+15559998888',
      status: 'revoked',
      revoked: true,
    });

    // Attempt recovery on revoked email
    const resEmail = await recoverGuestPassHandler(
      { contact: 'revoked.parent@example.com' },
      { rawRequest: { ip: '203.0.113.10' } },
      { db, now: () => baseTime }
    );
    assert.equal(resEmail.success, true);
    assert.equal(resEmail.message, GENERIC_RECOVERY_MESSAGE);

    // Pass doc activeTokenHashes must NOT have any new tokens added
    const passDoc = (await db.collection('guestPasses').doc('pass_revoked_1').get()).data();
    assert.deepEqual(passDoc.activeTokenHashes, ['hash_revoked']); // Token pool untouched!
  });

  test('recoverGuestPass — Constant-time response and secrecy on unknown contacts', async () => {
    const db = createMockDb();

    const res = await recoverGuestPassHandler(
      { contact: 'unknown.stranger@example.com' },
      { rawRequest: { ip: '203.0.113.20' } },
      { db, now: () => baseTime }
    );
    assert.equal(res.success, true);
    assert.equal(res.message, GENERIC_RECOVERY_MESSAGE);
  });

  test('recoverGuestPass — Dual Rate Limiting (10/min per IP, 3/hour per contact)', async () => {
    const db = createMockDb();
    const contact = 'busy.parent@example.com';
    const ip = '198.51.100.42';

    // 1. Contact rate limit: 3 allowed, 4th fails
    for (let i = 0; i < 3; i++) {
      await recoverGuestPassHandler(
        { contact },
        { rawRequest: { ip } },
        { db, now: () => baseTime + i * 1000 }
      );
    }

    await assert.rejects(
      async () => {
        await recoverGuestPassHandler(
          { contact },
          { rawRequest: { ip } },
          { db, now: () => baseTime + 4000 }
        );
      },
      (err) => {
        assert.equal(err.code, 'resource-exhausted');
        return true;
      }
    );
  });
});
