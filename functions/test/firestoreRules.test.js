'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { initializeTestEnvironment, assertSucceeds, assertFails } = require('@firebase/rules-unit-testing');

test('Firestore Security Rules — Real Emulator Test Suite (§7)', async (t) => {
  let testEnv;

  t.before(async () => {
    const rules = fs.readFileSync(path.resolve(__dirname, '../../firestore.rules'), 'utf8');
    const emulatorHost = process.env.FIRESTORE_EMULATOR_HOST;
    const host = emulatorHost ? emulatorHost.split(':')[0] : '127.0.0.1';
    const port = emulatorHost ? Number(emulatorHost.split(':')[1]) : 8080;

    testEnv = await initializeTestEnvironment({
      projectId: 'music-fun-rules-test',
      firestore: {
        rules,
        host,
        port,
      },
    });
  });

  t.after(async () => {
    if (testEnv) {
      await testEnv.cleanup();
    }
  });

  t.beforeEach(async () => {
    if (testEnv) {
      await testEnv.clearFirestore();
    }
  });

  await t.test('1. Unauthenticated baseline — denied on all collections', async () => {
    const unauthDb = testEnv.unauthenticatedContext().firestore();

    await assertFails(unauthDb.collection('guestPasses').doc('pass1').get());
    await assertFails(unauthDb.collection('guestPasses').doc('pass1').set({ foo: 'bar' }));
    await assertFails(unauthDb.collection('sessions').doc('sess1').get());
    await assertFails(unauthDb.collection('sessions').doc('sess1').set({ foo: 'bar' }));
    await assertFails(unauthDb.collection('joinRequests').doc('req1').get());
    await assertFails(unauthDb.collection('joinRequests').doc('req1').set({ foo: 'bar' }));
    await assertFails(unauthDb.collection('occupancy').doc('pass1').get());
    await assertFails(unauthDb.collection('occupancy').doc('pass1').set({ foo: 'bar' }));
    await assertFails(unauthDb.collection('rateLimits').doc('lim1').get());
    await assertFails(unauthDb.collection('rateLimits').doc('lim1').set({ foo: 'bar' }));
  });

  await t.test('2. Guest Passes — zero client reads or writes (even for own passId)', async () => {
    // Seed pass document via admin context (bypassing rules)
    await testEnv.withSecurityRulesDisabled(async (adminCtx) => {
      await adminCtx.firestore().collection('guestPasses').doc('pass_100').set({
        uid: 'guest_user_100',
        tokenHash: 'secret_hash_abcdef',
        programId: 'spring-2026',
        email: 'parent@example.com',
      });
    });

    const parentDb = testEnv.authenticatedContext('guest_user_100', {
      passId: 'pass_100',
      programId: 'spring-2026',
      isGuest: true,
    }).firestore();

    // Client read is blocked to guarantee tokenHash is NEVER delivered to client SDK (§7)
    await assertFails(parentDb.collection('guestPasses').doc('pass_100').get());
    await assertFails(parentDb.collection('guestPasses').doc('pass_other').get());
    await assertFails(parentDb.collection('guestPasses').doc('pass_100').set({ email: 'hacked@evil.com' }));
  });

  await t.test('3. Sessions — program isolation and instructor write authority', async () => {
    await testEnv.withSecurityRulesDisabled(async (adminCtx) => {
      await adminCtx.firestore().collection('sessions').doc('sess_spring').set({
        programId: 'spring-2026',
        state: 'lobby_open',
      });
      await adminCtx.firestore().collection('sessions').doc('sess_summer').set({
        programId: 'summer-2026',
        state: 'lobby_open',
      });
    });

    const springParentDb = testEnv.authenticatedContext('guest_user_100', {
      passId: 'pass_100',
      programId: 'spring-2026',
      isGuest: true,
    }).firestore();

    const instructorDb = testEnv.authenticatedContext('inst_1', {
      instructor: true,
    }).firestore();

    // Spring parent can read Spring session
    await assertSucceeds(springParentDb.collection('sessions').doc('sess_spring').get());

    // Spring parent CANNOT read Summer session
    await assertFails(springParentDb.collection('sessions').doc('sess_summer').get());

    // Parent CANNOT write to sessions
    await assertFails(springParentDb.collection('sessions').doc('sess_spring').update({ state: 'ended' }));

    // Instructor can read all and write
    await assertSucceeds(instructorDb.collection('sessions').doc('sess_spring').get());
    await assertSucceeds(instructorDb.collection('sessions').doc('sess_summer').get());
    await assertSucceeds(instructorDb.collection('sessions').doc('sess_spring').update({ state: 'live' }));
  });

  await t.test('4. Join Requests — anti-self-admission, active session check, and pass ownership', async () => {
    await testEnv.withSecurityRulesDisabled(async (adminCtx) => {
      await adminCtx.firestore().collection('sessions').doc('sess_active').set({
        programId: 'spring-2026',
        state: 'lobby_open',
      });
      await adminCtx.firestore().collection('sessions').doc('sess_scheduled').set({
        programId: 'spring-2026',
        state: 'scheduled',
      });
    });

    const parentDb = testEnv.authenticatedContext('guest_user_100', {
      passId: 'pass_100',
      programId: 'spring-2026',
      isGuest: true,
    }).firestore();

    // 1. Valid pending request for active session -> Succeeds
    await assertSucceeds(
      parentDb.collection('joinRequests').doc('req_1').set({
        passId: 'pass_100',
        sessionId: 'sess_active',
        status: 'pending',
      })
    );

    // 2. Anti-self-admission: Attempting to create with status: 'admitted' -> Fails
    await assertFails(
      parentDb.collection('joinRequests').doc('req_self_admit').set({
        passId: 'pass_100',
        sessionId: 'sess_active',
        status: 'admitted',
      })
    );

    // 3. Attempting to create request for inactive/scheduled session -> Fails
    await assertFails(
      parentDb.collection('joinRequests').doc('req_scheduled').set({
        passId: 'pass_100',
        sessionId: 'sess_scheduled',
        status: 'pending',
      })
    );

    // 4. Attempting to forge a request for another passId -> Fails
    await assertFails(
      parentDb.collection('joinRequests').doc('req_forged').set({
        passId: 'pass_other',
        sessionId: 'sess_active',
        status: 'pending',
      })
    );

    // 5. Parent attempting to update status -> Fails
    await assertFails(
      parentDb.collection('joinRequests').doc('req_1').update({
        status: 'admitted',
      })
    );
  });

  await t.test('5. Instructor — full queue read, status update (admit/deny), and deletion', async () => {
    await testEnv.withSecurityRulesDisabled(async (adminCtx) => {
      await adminCtx.firestore().collection('joinRequests').doc('req_pending').set({
        passId: 'pass_100',
        sessionId: 'sess_active',
        status: 'pending',
      });
    });

    const instructorDb = testEnv.authenticatedContext('inst_1', {
      instructor: true,
    }).firestore();

    // Instructor can read queue
    await assertSucceeds(instructorDb.collection('joinRequests').doc('req_pending').get());

    // Instructor can update status to admitted
    await assertSucceeds(
      instructorDb.collection('joinRequests').doc('req_pending').update({
        status: 'admitted',
      })
    );

    // Instructor can delete / clear queue
    await assertSucceeds(instructorDb.collection('joinRequests').doc('req_pending').delete());
  });

  await t.test('6. Occupancy & Internal Collections — pass-owner read, IDOR block, and server-write only', async () => {
    // Seed occupancy doc via admin context
    await testEnv.withSecurityRulesDisabled(async (adminCtx) => {
      await adminCtx.firestore().collection('occupancy').doc('pass_100').set({
        passId: 'pass_100',
        sessionId: 'sess_1',
        connectionId: 'c1',
      });
      await adminCtx.firestore().collection('occupancy').doc('pass_other').set({
        passId: 'pass_other',
        sessionId: 'sess_1',
        connectionId: 'c2',
      });
      await adminCtx.firestore().collection('joinTokens').doc('tok_hash_1').set({
        passId: 'pass_100',
        used: false,
      });
    });

    const parentDb = testEnv.authenticatedContext('guest_user_100', {
      passId: 'pass_100',
      programId: 'spring-2026',
      isGuest: true,
    }).firestore();

    const instructorDb = testEnv.authenticatedContext('inst_1', {
      instructor: true,
    }).firestore();

    // 1. Pass owner CAN read their own occupancy doc (enables instant onSnapshot displacement)
    await assertSucceeds(parentDb.collection('occupancy').doc('pass_100').get());

    // 2. Pass owner CANNOT read another pass's occupancy doc (IDOR protection)
    await assertFails(parentDb.collection('occupancy').doc('pass_other').get());

    // 3. Instructor can read any occupancy doc
    await assertSucceeds(instructorDb.collection('occupancy').doc('pass_100').get());
    await assertSucceeds(instructorDb.collection('occupancy').doc('pass_other').get());

    // 4. Occupancy writes blocked from all clients (server-only via Functions)
    await assertFails(parentDb.collection('occupancy').doc('pass_100').set({ connectionId: 'hacked' }));
    await assertFails(instructorDb.collection('occupancy').doc('pass_100').set({ connectionId: 'hacked' }));

    // 5. joinTokens blocked from all clients
    await assertFails(parentDb.collection('joinTokens').doc('tok_hash_1').get());
    await assertFails(parentDb.collection('joinTokens').doc('tok_hash_1').set({ used: true }));
    await assertFails(instructorDb.collection('joinTokens').doc('tok_hash_1').get());

    // 6. Rate limits blocked from all clients
    await assertFails(parentDb.collection('rateLimits').doc('ip_1').get());
    await assertFails(parentDb.collection('rateLimits').doc('ip_1').set({ count: 1 }));
    await assertFails(instructorDb.collection('rateLimits').doc('ip_1').get());
  });

  await t.test('7. Lobby Presence — client heartbeat write, instructor count read', async () => {
    const parentDb = testEnv.authenticatedContext('guest_user_100', {
      passId: 'pass_100',
      programId: 'spring-2026',
      isGuest: true,
    }).firestore();

    const instructorDb = testEnv.authenticatedContext('inst_1', {
      instructor: true,
    }).firestore();

    // Parent can write own presence
    await assertSucceeds(
      parentDb.collection('lobbyPresence').doc('sess_1').collection('active').doc('guest_user_100').set({
        heartbeatAt: new Date().toISOString(),
      })
    );

    // Parent cannot write someone else's presence
    await assertFails(
      parentDb.collection('lobbyPresence').doc('sess_1').collection('active').doc('other_uid').set({
        heartbeatAt: new Date().toISOString(),
      })
    );

    // Instructor can read active presence collection
    await assertSucceeds(
      instructorDb.collection('lobbyPresence').doc('sess_1').collection('active').doc('guest_user_100').get()
    );
  });
});

