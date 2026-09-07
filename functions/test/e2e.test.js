'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { createGuestPassHandler } = require('../guestPasses');
const { redeemPassHandler } = require('../redeem');
const { submitJoinRequestHandler, admitAllPendingHandler } = require('../admitQueue');
const {
  mintJoinTokenHandler,
  claimOccupancySlotHandler,
  heartbeatOccupancyHandler,
  releaseOccupancySlotHandler,
} = require('../occupancy');
const { hashToken } = require('../tokens');

/**
 * In-Memory Firestore database for complete End-to-End lifecycle simulation.
 */
function createE2eDb() {
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
          store.set(key, { ...store.get(key), ...data });
        } else {
          store.set(key, { ...data });
        }
      },
      async update(data) {
        if (!store.has(key)) throw new Error(`Doc ${key} does not exist for update`);
        const current = store.get(key);
        const updated = { ...current };
        for (const [k, v] of Object.entries(data)) {
          if (v && typeof v === 'object' && v.__arrayUnion) {
            const arr = Array.isArray(updated[k]) ? [...updated[k]] : [];
            for (const item of v.elements) {
              if (!arr.includes(item)) arr.push(item);
            }
            updated[k] = arr;
          } else {
            updated[k] = v;
          }
        }
        store.set(key, updated);
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
                return filters.every((f) => doc[f.field] === f.val);
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
    batch() {
      const ops = [];
      return {
        update(docRef, data) {
          ops.push(() => docRef.update(data));
        },
        set(docRef, data, opts) {
          ops.push(() => docRef.set(data, opts));
        },
        delete(docRef) {
          ops.push(() => docRef.delete());
        },
        async commit() {
          for (const op of ops) await op();
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

describe('End-to-End Guest Pass Lifecycle Simulation', () => {
  const baseTime = 1700000000000;
  process.env.APP_BASE_URL = 'https://musicfun.example.com';
  const adminAuth = {
    async createCustomToken(uid, claims) {
      return `custom_jwt_for_${uid}_claims_${JSON.stringify(claims)}`;
    },
  };

  test('Complete Flow: Mint -> Redeem -> Redirect -> Join -> Admit -> Occupancy -> 2nd Device Conflict -> Transfer', async () => {
    const db = createE2eDb();
    const programId = 'spring-2026';
    const sessionId = 'session_live_101';

    // Seed active session in database
    await db.collection('sessions').doc(sessionId).set({
      programId,
      state: 'lobby_open',
      title: 'Spring Music Fun Week 1',
    });

    // -------------------------------------------------------------
    // Step 1: Instructor Mints Guest Pass (Task 2)
    // -------------------------------------------------------------
    const instructorContext = {
      auth: { uid: 'instructor_1', token: { instructor: true } },
    };

    const passCreation = await createGuestPassHandler(
      {
        programId,
        adultName: 'Sarah Jenkins',
        childNames: ['Leo'],
        email: 'sarah@example.com',
        phone: '+15551234567',
      },
      instructorContext,
      { db, appBaseUrl: 'https://musicfun.example.com', now: () => baseTime }
    );

    assert.ok(passCreation.passId);
    assert.ok(passCreation.passUrl.startsWith('https://musicfun.example.com/my/'));
    const rawPassToken = passCreation.passUrl.replace('https://musicfun.example.com/my/', '');

    // Verify raw token is NOT in pass doc
    const passDoc = (await db.collection('guestPasses').doc(passCreation.passId).get()).data();
    assert.ok(passDoc.uid.startsWith('guest_'));
    assert.equal(JSON.stringify(passDoc).includes(rawPassToken), false);

    // -------------------------------------------------------------
    // Step 2: Parent Clicks Magic Link `GET /my/:token` (Task 3)
    // -------------------------------------------------------------
    let httpStatusCode = 0;
    let httpHeaders = {};
    let httpResponseBody = '';

    const req = {
      method: 'GET',
      params: { token: rawPassToken },
      path: `/my/${rawPassToken}`,
      ip: '198.51.100.1',
      headers: {},
      cookies: {},
    };

    const res = {
      status(code) {
        httpStatusCode = code;
        return this;
      },
      set(headers) {
        Object.assign(httpHeaders, headers);
        return this;
      },
      setHeader(name, val) {
        httpHeaders[name.toLowerCase()] = val;
        return this;
      },
      type(t) {
        httpHeaders['content-type'] = t;
        return this;
      },
      cookie(name, val, opts) {
        httpHeaders['set-cookie'] = `${name}=${val}`;
        return this;
      },
      send(body) {
        httpResponseBody = body;
        return this;
      },
    };

    await redeemPassHandler(req, res, { db, auth: adminAuth, now: () => baseTime });

    // Verify 200 OK HTML response with location.replace('/session') and NO raw token in target path
    assert.equal(httpStatusCode, 200);
    assert.match(httpResponseBody, /location\.replace\(['"]\/session['"]\)/);
    assert.equal(httpResponseBody.includes(rawPassToken), false); // Raw token never rendered
    assert.match(httpResponseBody, /custom_jwt_for_guest_/); // Decoupled custom token present

    // -------------------------------------------------------------
    // Step 3: Parent Lands on /session & Submits Join Request (Task 5)
    // -------------------------------------------------------------
    const parentAuthContext = {
      auth: {
        uid: passDoc.uid,
        token: { passId: passCreation.passId, programId, isGuest: true },
      },
    };

    const deviceId1 = 'device_laptop_uuid_1';
    const joinReqRes1 = await submitJoinRequestHandler(
      {
        sessionId,
        adultName: 'Sarah Jenkins',
        childNames: ['Leo'],
        sticker: 'guitar',
        borderColor: '#3b82f6',
        deviceId: deviceId1,
        moodChip: 'happy_excited', // Ephemeral mood chip passed in client payload
      },
      parentAuthContext,
      { db }
    );

    assert.equal(joinReqRes1.success, true);
    assert.equal(joinReqRes1.isNewDevice, true); // Server computed new device!

    // Verify joinRequest document in Firestore
    const reqDoc = (await db.collection('joinRequests').doc(`${sessionId}_${passCreation.passId}`).get()).data();
    assert.equal(reqDoc.status, 'pending');
    assert.equal(reqDoc.isNewDevice, true);
    assert.equal(JSON.stringify(reqDoc).includes('happy_excited'), false); // Strict §4.7 mood secrecy!

    // -------------------------------------------------------------
    // Step 4: Instructor Admits Join Request (Task 5)
    // -------------------------------------------------------------
    const admitRes = await admitAllPendingHandler(
      { sessionId },
      instructorContext,
      { db }
    );
    assert.equal(admitRes.success, true);
    assert.equal(admitRes.admittedCount, 1);

    const admittedDoc = (await db.collection('joinRequests').doc(`${sessionId}_${passCreation.passId}`).get()).data();
    assert.equal(admittedDoc.status, 'admitted');

    // -------------------------------------------------------------
    // Step 5: Parent Mints Join Token & Claims Occupancy Slot (Task 6)
    // -------------------------------------------------------------
    const mint1 = await mintJoinTokenHandler(
      { sessionId },
      parentAuthContext,
      { db, now: () => baseTime + 1000 }
    );
    assert.equal(mint1.success, true);
    const joinToken1 = mint1.joinToken;

    const connectionId1 = 'webrtc_conn_laptop';
    const claim1 = await claimOccupancySlotHandler(
      { sessionId, connectionId: connectionId1, joinToken: joinToken1 },
      parentAuthContext,
      { db, now: () => baseTime + 1000 }
    );
    assert.equal(claim1.status, 'connected');
    assert.equal(claim1.connectionId, connectionId1);

    // Slot is now occupied by laptop
    const occDoc = (await db.collection('occupancy').doc(passCreation.passId).get()).data();
    assert.equal(occDoc.connectionId, connectionId1);

    // -------------------------------------------------------------
    // Step 6: Parent Opens Link on 2nd Device (Phone) -> Conflict Prompt
    // -------------------------------------------------------------
    const connectionId2 = 'webrtc_conn_phone';
    const mint2 = await mintJoinTokenHandler(
      { sessionId },
      parentAuthContext,
      { db, now: () => baseTime + 5000 }
    );
    const joinToken2 = mint2.joinToken;

    // 2nd device attempts claim without forceTransfer -> Server returns conflict
    const claim2Conflict = await claimOccupancySlotHandler(
      { sessionId, connectionId: connectionId2, joinToken: joinToken2, forceTransfer: false },
      parentAuthContext,
      { db, now: () => baseTime + 5000 }
    );
    assert.equal(claim2Conflict.status, 'occupied');
    assert.equal(claim2Conflict.currentConnectionId, connectionId1); // Triggers "Join here instead" modal!

    // -------------------------------------------------------------
    // Step 7: Parent Taps "Join Here Instead" -> Force Transfer
    // -------------------------------------------------------------
    const claim2Transfer = await claimOccupancySlotHandler(
      { sessionId, connectionId: connectionId2, joinToken: joinToken2, forceTransfer: true },
      parentAuthContext,
      { db, now: () => baseTime + 6000 }
    );
    assert.equal(claim2Transfer.status, 'connected');
    assert.equal(claim2Transfer.connectionId, connectionId2);

    // Occupancy slot now belongs to phone
    const occDocTransferred = (await db.collection('occupancy').doc(passCreation.passId).get()).data();
    assert.equal(occDocTransferred.connectionId, connectionId2);

    // -------------------------------------------------------------
    // Step 8: Laptop Heartbeat Detects Instant Displacement
    // -------------------------------------------------------------
    const laptopHeartbeat = await heartbeatOccupancyHandler(
      { sessionId, connectionId: connectionId1 },
      parentAuthContext,
      { db, now: () => baseTime + 10000 }
    );
    assert.equal(laptopHeartbeat.status, 'displaced');

    // -------------------------------------------------------------
    // Step 9: Clean Disconnect on Phone
    // -------------------------------------------------------------
    const releaseRes = await releaseOccupancySlotHandler(
      { connectionId: connectionId2 },
      parentAuthContext,
      { db }
    );
    assert.equal(releaseRes.success, true);
    const occDocReleased = await db.collection('occupancy').doc(passCreation.passId).get();
    assert.equal(occDocReleased.exists, false);
  });
});
