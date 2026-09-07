'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { submitJoinRequestHandler, admitAllPendingHandler } = require('../admitQueue');
const { hashToken } = require('../tokens');

/**
 * Creates an in-memory mock Firestore instance for admit queue testing.
 */
function createAdmitQueueMockDb() {
  const store = new Map();

  const mockDb = {
    _store: store,
    collection(colName) {
      return {
        doc(docId) {
          const key = `${colName}/${docId}`;
          return {
            id: docId,
            async get() {
              const data = store.get(key);
              return {
                id: docId,
                exists: !!data,
                data: () => (data ? { ...data } : undefined),
              };
            },
            async set(data, opts = {}) {
              const current = opts.merge ? (store.get(key) || {}) : {};
              store.set(key, { ...current, ...data });
            },
            async update(patch) {
              const current = store.get(key) || {};
              for (const [k, v] of Object.entries(patch)) {
                if (v && typeof v === 'object' && (v.constructor?.name === 'ArrayUnionTransform' || Array.isArray(v.elements) || Array.isArray(v._elements))) {
                  const elements = Array.isArray(v.elements) ? v.elements : (Array.isArray(v._elements) ? v._elements : (v.val ? [v.val] : []));
                  current[k] = Array.isArray(current[k]) ? [...current[k]] : [];
                  for (const el of elements) {
                    if (!current[k].includes(el)) current[k].push(el);
                  }
                  continue;
                }
                current[k] = v;
              }
              store.set(key, current);
            },
          };
        },
        where(field, op, value) {
          return {
            where(f2, op2, v2) {
              return {
                async get() {
                  const matches = [];
                  for (const [k, docData] of store.entries()) {
                    if (k.startsWith(`${colName}/`) && docData[field] === value && docData[f2] === v2) {
                      const docId = k.split('/')[1];
                      matches.push({
                        id: docId,
                        ref: mockDb.collection(colName).doc(docId),
                        data: () => ({ ...docData }),
                      });
                    }
                  }
                  return { empty: matches.length === 0, docs: matches };
                },
              };
            },
          };
        },
      };
    },
    batch() {
      const operations = [];
      return {
        update(docRef, patch) {
          operations.push({ docRef, patch });
        },
        async commit() {
          for (const op of operations) {
            await op.docRef.update(op.patch);
          }
        },
      };
    },
  };

  return mockDb;
}

test('Join Request & Admit Queue — Task 5 Acceptance Tests', async (t) => {

  await t.test('submitJoinRequest — auth, session state validation, and program scoping', async () => {
    const db = createAdmitQueueMockDb();

    // Seed session in lobby_open state and pass
    db._store.set('sessions/sess_live', { programId: 'spring-2026', state: 'lobby_open' });
    db._store.set('sessions/sess_ended', { programId: 'spring-2026', state: 'ended' });
    db._store.set('guestPasses/pass_1', { programId: 'spring-2026', adultName: 'Alice', knownDevices: [] });

    const validAuth = {
      uid: 'guest_user_1',
      token: { passId: 'pass_1', programId: 'spring-2026', isGuest: true },
    };

    // 1. Unauthenticated -> unauthenticated
    await assert.rejects(
      async () => submitJoinRequestHandler({ sessionId: 'sess_live' }, null, { db }),
      (err) => err.code === 'unauthenticated'
    );

    // 2. Program mismatch -> permission-denied
    await assert.rejects(
      async () => submitJoinRequestHandler(
        { sessionId: 'sess_live' },
        { auth: { uid: 'u_wrong', token: { passId: 'pass_1', programId: 'wrong-program' } } },
        { db }
      ),
      (err) => err.code === 'permission-denied'
    );

    // 3. Inactive/ended session -> failed-precondition
    await assert.rejects(
      async () => submitJoinRequestHandler(
        { sessionId: 'sess_ended' },
        { auth: validAuth },
        { db }
      ),
      (err) => err.code === 'failed-precondition'
    );

    // 4. Valid active session -> success
    const result = await submitJoinRequestHandler(
      {
        sessionId: 'sess_live',
        adultName: 'Alice Connor',
        childNames: ['Timmy'],
        sticker: 'Guitar.svg',
        borderColor: '#00FCFC',
        birthdayThisWeek: true,
      },
      { auth: validAuth },
      { db }
    );

    assert.equal(result.success, true);
    assert.equal(result.requestId, 'sess_live_pass_1');

    const storedRequest = db._store.get('joinRequests/sess_live_pass_1');
    assert.equal(storedRequest.status, 'pending');
    assert.equal(storedRequest.adultName, 'Alice Connor');
    assert.equal(storedRequest.childNames[0], 'Timmy');
    assert.equal(storedRequest.sticker, 'Guitar.svg');
    assert.equal(storedRequest.borderColor, '#00FCFC');
    assert.equal(storedRequest.birthdayThisWeek, true);
  });

  await t.test('submitJoinRequest — server-determined isNewDevice flag calculation', async () => {
    const db = createAdmitQueueMockDb();
    const existingDevice = 'device_registered_12345';
    const newDevice = 'device_new_device_99999';

    db._store.set('sessions/sess_live', { programId: 'spring-2026', state: 'lobby_open' });
    db._store.set('guestPasses/pass_dev', {
      programId: 'spring-2026',
      knownDevices: [hashToken(existingDevice)],
    });

    const auth = {
      uid: 'guest_user_dev',
      token: { passId: 'pass_dev', programId: 'spring-2026', isGuest: true },
    };

    // 1. Join with known device -> isNewDevice: false
    const knownResult = await submitJoinRequestHandler(
      { sessionId: 'sess_live', deviceId: existingDevice },
      { auth },
      { db }
    );
    assert.equal(knownResult.isNewDevice, false);
    assert.equal(db._store.get('joinRequests/sess_live_pass_dev').isNewDevice, false);

    // 2. Join with unknown device -> isNewDevice: true (and updates knownDevices on pass)
    const newResult = await submitJoinRequestHandler(
      { sessionId: 'sess_live', deviceId: newDevice },
      { auth },
      { db }
    );
    assert.equal(newResult.isNewDevice, true);
    assert.equal(db._store.get('joinRequests/sess_live_pass_dev').isNewDevice, true);

    const updatedPass = db._store.get('guestPasses/pass_dev');
    assert.ok(updatedPass.knownDevices.includes(hashToken(newDevice)));
  });

  await t.test('submitJoinRequest — Strict §4.7 Ephemeral Mood Secrecy (Whole Document JSON Check)', async () => {
    const db = createAdmitQueueMockDb();
    db._store.set('sessions/sess_live', { programId: 'spring-2026', state: 'lobby_open' });
    db._store.set('guestPasses/pass_mood', { programId: 'spring-2026', knownDevices: [] });

    const auth = {
      uid: 'guest_user_mood',
      token: { passId: 'pass_mood', programId: 'spring-2026', isGuest: true },
    };

    // Client passes mood / vibe chips alongside request payload
    const dirtyPayload = {
      sessionId: 'sess_live',
      adultName: 'Sarah',
      childNames: ['Leo'],
      vibeChips: ['high_energy', '⚡', 'Tired / Low'],
      mood: 'energized',
      feeling: 'excited',
    };

    await submitJoinRequestHandler(dirtyPayload, { auth }, { db });

    const storedDoc = db._store.get('joinRequests/sess_live_pass_mood');
    assert.ok(storedDoc, 'Join request must be created');

    // Whole-document JSON serialization check: mood values must NEVER appear
    const docJson = JSON.stringify(storedDoc);
    assert.equal(docJson.includes('high_energy'), false, 'Mood high_energy must not be persisted');
    assert.equal(docJson.includes('⚡'), false, 'Emoji ⚡ must not be persisted');
    assert.equal(docJson.includes('Tired / Low'), false, 'Mood Tired / Low must not be persisted');
    assert.equal(docJson.includes('energized'), false, 'Mood energized must not be persisted');
    assert.equal(docJson.includes('feeling'), false, 'Feeling must not be persisted');
    assert.equal(docJson.includes('vibeChips'), false, 'vibeChips must not be persisted');
  });

  await t.test('submitJoinRequest — Denied state recovery via re-submission', async () => {
    const db = createAdmitQueueMockDb();
    db._store.set('sessions/sess_live', { programId: 'spring-2026', state: 'lobby_open' });
    db._store.set('guestPasses/pass_rec', { programId: 'spring-2026', knownDevices: [] });

    // Seed previous denied request
    db._store.set('joinRequests/sess_live_pass_rec', {
      sessionId: 'sess_live',
      passId: 'pass_rec',
      status: 'denied',
    });

    const auth = {
      uid: 'guest_user_rec',
      token: { passId: 'pass_rec', programId: 'spring-2026', isGuest: true },
    };

    // Parent re-submits join request
    const result = await submitJoinRequestHandler(
      { sessionId: 'sess_live', adultName: 'Sarah' },
      { auth },
      { db }
    );

    assert.equal(result.success, true);
    const updatedDoc = db._store.get('joinRequests/sess_live_pass_rec');
    assert.equal(updatedDoc.status, 'pending', 'Status must be reset to pending on re-submission');
  });

  await t.test('admitAllPending — batch updates all pending requests for instructor', async () => {
    const db = createAdmitQueueMockDb();

    // Seed 3 pending requests and 1 already admitted request
    db._store.set('joinRequests/sess_1_pass_a', { sessionId: 'sess_1', passId: 'pass_a', status: 'pending' });
    db._store.set('joinRequests/sess_1_pass_b', { sessionId: 'sess_1', passId: 'pass_b', status: 'pending' });
    db._store.set('joinRequests/sess_1_pass_c', { sessionId: 'sess_1', passId: 'pass_c', status: 'pending' });
    db._store.set('joinRequests/sess_1_pass_d', { sessionId: 'sess_1', passId: 'pass_d', status: 'admitted' });
    db._store.set('joinRequests/sess_other_pass_e', { sessionId: 'sess_other', passId: 'pass_e', status: 'pending' });

    const parentAuth = { uid: 'guest_u1', token: { isGuest: true } };
    const instructorAuth = { uid: 'inst_1', token: { instructor: true } };

    // 1. Non-instructor -> permission-denied
    await assert.rejects(
      async () => admitAllPendingHandler({ sessionId: 'sess_1' }, { auth: parentAuth }, { db }),
      (err) => err.code === 'permission-denied'
    );

    // 2. Instructor executes admitAllPending
    const result = await admitAllPendingHandler({ sessionId: 'sess_1' }, { auth: instructorAuth }, { db });
    assert.equal(result.success, true);
    assert.equal(result.admittedCount, 3);

    // Assert all 3 pending requests for sess_1 are now admitted
    assert.equal(db._store.get('joinRequests/sess_1_pass_a').status, 'admitted');
    assert.equal(db._store.get('joinRequests/sess_1_pass_b').status, 'admitted');
    assert.equal(db._store.get('joinRequests/sess_1_pass_c').status, 'admitted');

    // Other session pending request remains unchanged
    assert.equal(db._store.get('joinRequests/sess_other_pass_e').status, 'pending');
  });

});
