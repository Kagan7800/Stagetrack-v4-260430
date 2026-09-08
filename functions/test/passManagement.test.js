'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const {
  listGuestPassesHandler,
  rotatePassLinkHandler,
  revokeGuestPassHandler,
} = require('../passManagement');
const { createGuestPassHandler } = require('../guestPasses');
const { redeemPassHandler } = require('../redeem');
const { recoverGuestPassHandler, GENERIC_RECOVERY_MESSAGE } = require('../recovery');
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
          store.set(key, { ...current, ...data });
        } else {
          store.set(key, { ...data });
        }
      },
      async update(data) {
        if (!store.has(key)) throw new Error(`Doc ${key} does not exist`);
        const current = store.get(key) || {};
        store.set(key, { ...current, ...data });
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

describe('Task 8: Pass Management, Token Rotation, & Revocation Acceptance Tests', () => {
  const baseTime = 1700000000000;
  const baseUrl = 'http://127.0.0.1:5000';
  const instructorCtx = { auth: { uid: 'inst_1', token: { instructor: true } } };
  const parentCtx = { auth: { uid: 'guest_1', token: { isGuest: true, passId: 'pass_1' } } };
  const unauthCtx = null;

  test('Auth Gate — list, rotate, and revoke reject unauthorized callers', async () => {
    const db = createMockDb();

    // 1. Unauthenticated
    await assert.rejects(
      async () => listGuestPassesHandler({ programId: 'prog_1' }, unauthCtx, { db }),
      (err) => err.code === 'permission-denied'
    );
    await assert.rejects(
      async () => rotatePassLinkHandler({ passId: 'pass_1' }, unauthCtx, { db, baseUrl }),
      (err) => err.code === 'permission-denied'
    );
    await assert.rejects(
      async () => revokeGuestPassHandler({ passId: 'pass_1' }, unauthCtx, { db }),
      (err) => err.code === 'permission-denied'
    );

    // 2. Non-instructor / Parent
    await assert.rejects(
      async () => listGuestPassesHandler({ programId: 'prog_1' }, parentCtx, { db }),
      (err) => err.code === 'permission-denied'
    );
    await assert.rejects(
      async () => rotatePassLinkHandler({ passId: 'pass_1' }, parentCtx, { db, baseUrl }),
      (err) => err.code === 'permission-denied'
    );
    await assert.rejects(
      async () => revokeGuestPassHandler({ passId: 'pass_1' }, parentCtx, { db }),
      (err) => err.code === 'permission-denied'
    );
  });

  test('listGuestPasses — program scoping and client-safe projection (zero token/device leaks)', async () => {
    const db = createMockDb();

    // Seed passes for two different programs
    await createGuestPassHandler(
      { programId: 'prog_spring', email: 'alice@example.com', adultName: 'Alice' },
      instructorCtx,
      { db, baseUrl, now: () => baseTime }
    );
    await createGuestPassHandler(
      { programId: 'prog_spring', email: 'bob@example.com', adultName: 'Bob' },
      instructorCtx,
      { db, baseUrl, now: () => baseTime }
    );
    await createGuestPassHandler(
      { programId: 'prog_fall', email: 'carol@example.com', adultName: 'Carol' },
      instructorCtx,
      { db, baseUrl, now: () => baseTime }
    );

    // Query prog_spring passes
    const res = await listGuestPassesHandler({ programId: 'prog_spring' }, instructorCtx, { db });
    assert.ok(Array.isArray(res.passes));
    assert.equal(res.passes.length, 2);

    for (const pass of res.passes) {
      assert.equal(pass.programId, 'prog_spring');
      assert.equal(pass.status, 'active');
      assert.ok(pass.uid, 'Must have uid');
      assert.ok(pass.email, 'Must have email');

      // Strict security invariants: server-only fields are NOT leaked
      assert.equal(pass.tokenHash, undefined, 'tokenHash must NEVER be exposed');
      assert.equal(pass.activeTokenHashes, undefined, 'activeTokenHashes must NEVER be exposed');
      assert.equal(pass.activeTokenPool, undefined, 'activeTokenPool must NEVER be exposed');
      assert.equal(pass.knownDevices, undefined, 'knownDevices must NEVER be exposed');
    }
  });

  test('rotatePassLink — intentional rotation invalidates all previous tokens and preserves uid', async () => {
    const db = createMockDb();

    // 1. Create initial pass
    const creation = await createGuestPassHandler(
      { programId: 'prog_spring', email: 'david@example.com', adultName: 'David' },
      instructorCtx,
      { db, baseUrl, now: () => baseTime }
    );

    const oldToken = creation.passUrl.replace('http://127.0.0.1:5000/my/', '');
    const oldPassData = (await db.collection('guestPasses').doc(creation.passId).get()).data();
    const originalUid = oldPassData.uid;

    // 2. Add a recovery token so the pool has 2 tokens
    await recoverGuestPassHandler(
      { contact: 'david@example.com' },
      { rawRequest: { ip: '198.51.100.1' } },
      { db, now: () => baseTime + 1000 }
    );

    const passBeforeRotation = (await db.collection('guestPasses').doc(creation.passId).get()).data();
    assert.equal(passBeforeRotation.activeTokenHashes.length, 2);

    // 3. Intentionally rotate the link
    const rotateRes = await rotatePassLinkHandler(
      { passId: creation.passId },
      instructorCtx,
      { db, baseUrl, now: () => baseTime + 2000 }
    );

    assert.equal(rotateRes.success, true);
    assert.ok(rotateRes.passUrl);
    const newToken = rotateRes.passUrl.replace('http://127.0.0.1:5000/my/', '');
    assert.notEqual(newToken, oldToken);

    // 4. Verify Firestore state: activeTokenHashes is strictly [newTokenHash], uid is preserved
    const passAfterRotation = (await db.collection('guestPasses').doc(creation.passId).get()).data();
    assert.equal(passAfterRotation.uid, originalUid, 'uid must be preserved across rotations');
    assert.equal(passAfterRotation.status, 'active');
    assert.equal(passAfterRotation.activeTokenHashes.length, 1);
    assert.equal(passAfterRotation.activeTokenHashes[0], hashToken(newToken));
    assert.equal(passAfterRotation.activeTokenPool.length, 1);
    assert.equal(passAfterRotation.activeTokenPool[0].hash, hashToken(newToken));

    // 5. Verify old token now returns 404 in redeemPassHandler
    let statusOld = 0;
    const resOld = {
      status(c) { statusOld = c; return this; },
      set() { return this; },
      setHeader() { return this; },
      send() { return this; },
    };
    const mockAuth = { async createCustomToken(uid, claims) { return 'jwt_custom'; } };
    await redeemPassHandler(
      { method: 'GET', path: `/my/${oldToken}`, ip: '10.0.0.1', headers: {} },
      resOld,
      { db, auth: mockAuth, now: () => baseTime + 3000 }
    );
    assert.equal(statusOld, 404, 'Old token must return 404 after intentional rotation');

    // 6. Verify new token succeeds with 200
    let statusNew = 0;
    const resNew = {
      status(c) { statusNew = c; return this; },
      set() { return this; },
      setHeader() { return this; },
      send() { return this; },
    };
    await redeemPassHandler(
      { method: 'GET', path: `/my/${newToken}`, ip: '10.0.0.2', headers: {} },
      resNew,
      { db, auth: mockAuth, now: () => baseTime + 3000 }
    );
    assert.equal(statusNew, 200, 'New rotated token must succeed with 200');
  });

  test('revokeGuestPass — sets status: revoked, empties pool, revokes refresh tokens, deletes occupancy, and blocks redemption/recovery', async () => {
    const db = createMockDb();
    let revokedUid = null;
    const mockAuth = {
      async revokeRefreshTokens(uid) {
        revokedUid = uid;
      },
      async createCustomToken() {
        return 'jwt_custom';
      },
    };

    // 1. Create active pass
    const creation = await createGuestPassHandler(
      { programId: 'prog_spring', email: 'eve@example.com', adultName: 'Eve' },
      instructorCtx,
      { db, baseUrl, now: () => baseTime }
    );
    const rawToken = creation.passUrl.replace('http://127.0.0.1:5000/my/', '');

    // Seed active occupancy doc and joinRequests doc
    await db.collection('occupancy').doc(creation.passId).set({
      passId: creation.passId,
      programId: 'prog_spring',
      holderUid: 'guest_eve',
      status: 'occupied',
    });
    await db.collection('joinRequests').doc(`session_1_${creation.passId}`).set({
      sessionId: 'session_1',
      passId: creation.passId,
      status: 'admitted',
    });

    // 2. Revoke the pass
    const revokeRes = await revokeGuestPassHandler(
      { passId: creation.passId },
      instructorCtx,
      { db, auth: mockAuth }
    );

    assert.equal(revokeRes.success, true);
    assert.equal(revokeRes.passId, creation.passId);

    // 3. Assert Firestore state
    const passDoc = (await db.collection('guestPasses').doc(creation.passId).get()).data();
    assert.equal(passDoc.status, 'revoked');
    assert.ok(passDoc.revokedAt, 'Must set revokedAt timestamp');
    assert.deepEqual(passDoc.activeTokenHashes, []);
    assert.deepEqual(passDoc.activeTokenPool, []);

    // 4. Assert Firebase Auth revokeRefreshTokens was called with the decoupled pass.uid
    assert.equal(revokedUid, passDoc.uid);

    // 5. Assert occupancy doc and joinRequests were cleanly deleted
    const occDoc = await db.collection('occupancy').doc(creation.passId).get();
    assert.equal(occDoc.exists, false, 'Occupancy document must be deleted on revocation');
    const reqDoc = await db.collection('joinRequests').doc(`session_1_${creation.passId}`).get();
    assert.equal(reqDoc.exists, false, 'JoinRequest document must be deleted on revocation');

    // 6. Assert redemption returns 404
    let statusRedeem = 0;
    const resRedeem = {
      status(c) { statusRedeem = c; return this; },
      set() { return this; },
      setHeader() { return this; },
      send() { return this; },
    };
    await redeemPassHandler(
      { method: 'GET', path: `/my/${rawToken}`, ip: '10.0.0.1', headers: {} },
      resRedeem,
      { db, auth: mockAuth, now: () => baseTime + 1000 }
    );
    assert.equal(statusRedeem, 404, 'Revoked pass redemption must return 404');

    // 7. Assert recovery refuses to add tokens or resurrect the pass
    await recoverGuestPassHandler(
      { contact: 'eve@example.com' },
      { rawRequest: { ip: '10.0.0.1' } },
      { db, now: () => baseTime + 2000 }
    );
    const passDocAfterRecovery = (await db.collection('guestPasses').doc(creation.passId).get()).data();
    assert.deepEqual(passDocAfterRecovery.activeTokenHashes, [], 'Revoked pass must not be resurrected by recovery');

    // 8. Assert rotatePassLink rejects revoked pass
    await assert.rejects(
      async () => rotatePassLinkHandler({ passId: creation.passId }, instructorCtx, { db, baseUrl }),
      (err) => err.code === 'failed-precondition'
    );
  });

  test('revokeGuestPass — failed joinRequests cleanup rejects revocation without swallowing error (A5.1)', async () => {
    const db = createMockDb();
    const creation = await createGuestPassHandler(
      { programId: 'prog_spring', email: 'fail@example.com', adultName: 'FailTest' },
      instructorCtx,
      { db, baseUrl, now: () => baseTime }
    );

    // Override collection('joinRequests') to simulate a database query error during cleanup
    const origCollection = db.collection.bind(db);
    db.collection = (col) => {
      if (col === 'joinRequests') {
        return {
          where() {
            throw new Error('Firestore joinRequests query failure');
          },
        };
      }
      return origCollection(col);
    };

    const mockAuth = { async revokeRefreshTokens() {} };
    await assert.rejects(
      async () => {
        await revokeGuestPassHandler(
          { passId: creation.passId },
          instructorCtx,
          { db, auth: mockAuth }
        );
      },
      (err) => {
        assert.match(err.message, /Firestore joinRequests query failure/);
        return true;
      }
    );
  });
});

