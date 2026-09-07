'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const {
  mintJoinTokenHandler,
  claimOccupancySlotHandler,
  heartbeatOccupancyHandler,
  releaseOccupancySlotHandler,
  TOKEN_TTL_MS,
  STALE_OCCUPANCY_MS,
  TRANSFER_COOLDOWN_MS,
} = require('../occupancy');
const { hashToken } = require('../tokens');

/**
 * In-memory Mock Firestore Database supporting collections, transactions, and timestamps.
 */
function createMockDb() {
  const store = new Map(); // key -> document data object

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
          store.set(key, { ...store.get(key), ...data });
        } else {
          store.set(key, { ...data });
        }
      },
      async update(data) {
        if (!store.has(key)) throw new Error(`Doc ${key} does not exist for update`);
        store.set(key, { ...store.get(key), ...data });
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
        doc(docId) {
          return getDocRef(col, docId);
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
          store.set(docRef.path, { ...store.get(docRef.path), ...data });
        },
        delete(docRef) {
          store.delete(docRef.path);
        },
      };
      return await updateFn(transaction);
    },
  };
}

describe('Task 6: Join Token & Exclusivity Acceptance Tests', () => {
  const baseTime = 1700000000000;

  test('mintJoinToken — requires admitted joinRequest, creates 60s token, enforces secrecy', async () => {
    const db = createMockDb();
    const sessionId = 'session_t6_1';
    const passId = 'pass_t6_1';
    const uid = 'guest_user_1';

    // 1. Unadmitted joinRequest should fail
    await db.collection('joinRequests').doc(`${sessionId}_${passId}`).set({
      sessionId,
      passId,
      status: 'pending',
    });

    const context = {
      auth: {
        uid,
        token: { passId, programId: 'prog_1', isGuest: true },
      },
    };

    await assert.rejects(
      async () => {
        await mintJoinTokenHandler({ sessionId }, context, { db, now: () => baseTime });
      },
      (err) => err.code === 'failed-precondition'
    );

    // 2. Admitted request succeeds
    await db.collection('joinRequests').doc(`${sessionId}_${passId}`).set({
      sessionId,
      passId,
      status: 'admitted',
    });

    const mintResult = await mintJoinTokenHandler({ sessionId }, context, { db, now: () => baseTime });
    assert.equal(mintResult.success, true);
    assert.ok(typeof mintResult.joinToken === 'string' && mintResult.joinToken.length > 20);
    assert.equal(mintResult.expiresAt, baseTime + TOKEN_TTL_MS);

    // 3. Verify Firestore storage and secrecy
    const tokenHash = hashToken(mintResult.joinToken);
    const storedDoc = (await db.collection('joinTokens').doc(tokenHash).get()).data();
    assert.ok(storedDoc);
    assert.equal(storedDoc.passId, passId);
    assert.equal(storedDoc.used, false);

    // Raw token must NEVER be written to the database document
    const serialized = JSON.stringify(storedDoc);
    assert.equal(serialized.includes(mintResult.joinToken), false);
  });

  test('claimOccupancySlot — transactional consumption, single-use, and EXPLICIT REPLAY REJECTION', async () => {
    const db = createMockDb();
    const sessionId = 'session_t6_2';
    const passId = 'pass_t6_2';
    const uid = 'guest_user_2';
    const conn1 = 'conn_device_a';

    // Prepare admitted pass and mint join token
    await db.collection('joinRequests').doc(`${sessionId}_${passId}`).set({
      sessionId,
      passId,
      status: 'admitted',
    });

    const context = {
      auth: { uid, token: { passId, programId: 'prog_1', isGuest: true } },
    };

    const { joinToken } = await mintJoinTokenHandler({ sessionId }, context, { db, now: () => baseTime });

    // First claim: Succeeds
    const claimRes1 = await claimOccupancySlotHandler(
      { sessionId, connectionId: conn1, joinToken },
      context,
      { db, now: () => baseTime }
    );
    assert.equal(claimRes1.status, 'connected');
    assert.equal(claimRes1.connectionId, conn1);

    // Verify token marked used
    const tokenDoc = (await db.collection('joinTokens').doc(hashToken(joinToken)).get()).data();
    assert.equal(tokenDoc.used, true);

    // Second claim with SAME token (EXPLICIT REPLAY TEST): Fails
    await assert.rejects(
      async () => {
        await claimOccupancySlotHandler(
          { sessionId, connectionId: 'conn_device_b', joinToken },
          context,
          { db, now: () => baseTime + 1000 }
        );
      },
      (err) => {
        assert.equal(err.code, 'failed-precondition');
        assert.match(err.message, /already been used/i);
        return true;
      }
    );
  });

  test('claimOccupancySlot — EXPLICIT EXPIRED TOKEN REJECTION', async () => {
    const db = createMockDb();
    const sessionId = 'session_t6_3';
    const passId = 'pass_t6_3';
    const uid = 'guest_user_3';

    await db.collection('joinRequests').doc(`${sessionId}_${passId}`).set({
      sessionId,
      passId,
      status: 'admitted',
    });

    const context = {
      auth: { uid, token: { passId, programId: 'prog_1', isGuest: true } },
    };

    const { joinToken } = await mintJoinTokenHandler({ sessionId }, context, { db, now: () => baseTime });

    // Advance clock past 60-second TTL (61 seconds)
    const expiredTime = baseTime + 61000;

    await assert.rejects(
      async () => {
        await claimOccupancySlotHandler(
          { sessionId, connectionId: 'conn_device_c', joinToken },
          context,
          { db, now: () => expiredTime }
        );
      },
      (err) => {
        assert.equal(err.code, 'failed-precondition');
        assert.match(err.message, /expired/i);
        return true;
      }
    );
  });

  test('Exclusivity Conflict & Transfer Cooldown Enforcement', async () => {
    const db = createMockDb();
    const sessionId = 'session_t6_4';
    const passId = 'pass_t6_4';
    const uid = 'guest_user_4';
    const conn1 = 'device_ipad';
    const conn2 = 'device_iphone';

    await db.collection('joinRequests').doc(`${sessionId}_${passId}`).set({
      sessionId,
      passId,
      status: 'admitted',
    });

    const context = {
      auth: { uid, token: { passId, programId: 'prog_1', isGuest: true } },
    };

    // 1. Device 1 connects and claims slot
    const token1 = (await mintJoinTokenHandler({ sessionId }, context, { db, now: () => baseTime })).joinToken;
    const claim1 = await claimOccupancySlotHandler(
      { sessionId, connectionId: conn1, joinToken: token1 },
      context,
      { db, now: () => baseTime }
    );
    assert.equal(claim1.status, 'connected');

    // 2. Device 2 connects with fresh token; heartbeat is active on Device 1 -> Conflict returned
    const token2 = (await mintJoinTokenHandler({ sessionId }, context, { db, now: () => baseTime + 5000 })).joinToken;
    const claim2 = await claimOccupancySlotHandler(
      { sessionId, connectionId: conn2, joinToken: token2, forceTransfer: false },
      context,
      { db, now: () => baseTime + 5000 }
    );
    assert.equal(claim2.status, 'occupied');
    assert.equal(claim2.currentConnectionId, conn1);

    // 3. Device 2 requests forceTransfer -> Takeover succeeds, sets lastTransferredAt
    const claim2Transfer = await claimOccupancySlotHandler(
      { sessionId, connectionId: conn2, joinToken: token2, forceTransfer: true },
      context,
      { db, now: () => baseTime + 6000 }
    );
    assert.equal(claim2Transfer.status, 'connected');
    assert.equal(claim2Transfer.connectionId, conn2);

    // 4. Device 1 immediately attempts forceTransfer within 15s cooldown -> Rejected
    const token3 = (await mintJoinTokenHandler({ sessionId }, context, { db, now: () => baseTime + 8000 })).joinToken;
    await assert.rejects(
      async () => {
        await claimOccupancySlotHandler(
          { sessionId, connectionId: conn1, joinToken: token3, forceTransfer: true },
          context,
          { db, now: () => baseTime + 8000 } // only 2s after last transfer
        );
      },
      (err) => {
        assert.equal(err.code, 'failed-precondition');
        assert.match(err.message, /cooldown in effect/i);
        return true;
      }
    );

    // 5. After 15-second cooldown (baseTime + 22s), forceTransfer succeeds
    const claim1AfterCooldown = await claimOccupancySlotHandler(
      { sessionId, connectionId: conn1, joinToken: token3, forceTransfer: true },
      context,
      { db, now: () => baseTime + 22000 }
    );
    assert.equal(claim1AfterCooldown.status, 'connected');
  });

  test('Heartbeat, Displacement Detection, and Clean Release', async () => {
    const db = createMockDb();
    const sessionId = 'session_t6_5';
    const passId = 'pass_t6_5';
    const uid = 'guest_user_5';
    const connA = 'conn_laptop';
    const connB = 'conn_phone';

    await db.collection('joinRequests').doc(`${sessionId}_${passId}`).set({
      sessionId,
      passId,
      status: 'admitted',
    });

    const context = {
      auth: { uid, token: { passId, programId: 'prog_1', isGuest: true } },
    };

    // Laptop claims slot
    const tokenA = (await mintJoinTokenHandler({ sessionId }, context, { db, now: () => baseTime })).joinToken;
    await claimOccupancySlotHandler(
      { sessionId, connectionId: connA, joinToken: tokenA },
      context,
      { db, now: () => baseTime }
    );

    // Laptop sends 15s heartbeat -> active
    const hb1 = await heartbeatOccupancyHandler(
      { sessionId, connectionId: connA },
      context,
      { db, now: () => baseTime + 15000 }
    );
    assert.equal(hb1.status, 'active');

    // Phone transfers slot
    const tokenB = (await mintJoinTokenHandler({ sessionId }, context, { db, now: () => baseTime + 20000 })).joinToken;
    await claimOccupancySlotHandler(
      { sessionId, connectionId: connB, joinToken: tokenB, forceTransfer: true },
      context,
      { db, now: () => baseTime + 20000 }
    );

    // Laptop sends heartbeat on next tick -> Displaced
    const hbDisplaced = await heartbeatOccupancyHandler(
      { sessionId, connectionId: connA },
      context,
      { db, now: () => baseTime + 30000 }
    );
    assert.equal(hbDisplaced.status, 'displaced');

    // Phone clean release -> Deletes occupancy document
    const releaseRes = await releaseOccupancySlotHandler(
      { connectionId: connB },
      context,
      { db }
    );
    assert.equal(releaseRes.success, true);
    const occDoc = await db.collection('occupancy').doc(passId).get();
    assert.equal(occDoc.exists, false);
  });

  test('45-second Staleness Recovery — slot reclaimed without forceTransfer', async () => {
    const db = createMockDb();
    const sessionId = 'session_t6_6';
    const passId = 'pass_t6_6';
    const uid = 'guest_user_6';
    const connOld = 'conn_abandoned_device';
    const connNew = 'conn_new_device';

    // Occupancy exists with abandoned heartbeat 50 seconds ago
    await db.collection('occupancy').doc(passId).set({
      passId,
      sessionId,
      connectionId: connOld,
      uid,
      heartbeatAt: baseTime,
    });

    await db.collection('joinRequests').doc(`${sessionId}_${passId}`).set({
      sessionId,
      passId,
      status: 'admitted',
    });

    const context = {
      auth: { uid, token: { passId, programId: 'prog_1', isGuest: true } },
    };

    const tokenNew = (await mintJoinTokenHandler({ sessionId }, context, { db, now: () => baseTime + 50000 })).joinToken;

    // Claim slot at baseTime + 50000 (past 45s staleness window) without forceTransfer
    const claimRes = await claimOccupancySlotHandler(
      { sessionId, connectionId: connNew, joinToken: tokenNew, forceTransfer: false },
      context,
      { db, now: () => baseTime + 50000 }
    );

    assert.equal(claimRes.status, 'connected');
    assert.equal(claimRes.connectionId, connNew);
  });
});
