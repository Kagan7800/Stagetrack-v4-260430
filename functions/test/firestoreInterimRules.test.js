'use strict';

const test = require('node:test');
const fs = require('fs');
const path = require('path');
const { initializeTestEnvironment, assertSucceeds, assertFails } = require('@firebase/rules-unit-testing');

test('Firestore Interim Security Rules — Verification Test Suite', async (t) => {
  let testEnv;

  t.before(async () => {
    const rules = fs.readFileSync(path.resolve(__dirname, '../../firestore.interim.rules'), 'utf8');
    const emulatorHost = process.env.FIRESTORE_EMULATOR_HOST;
    const host = emulatorHost ? emulatorHost.split(':')[0] : '127.0.0.1';
    const port = emulatorHost ? Number(emulatorHost.split(':')[1]) : 8080;

    testEnv = await initializeTestEnvironment({
      projectId: 'music-fun-interim-rules-test',
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

  await t.test('1. Unauthenticated public internet access is completely blocked', async () => {
    const unauthDb = testEnv.unauthenticatedContext().firestore();

    await assertFails(unauthDb.collection('sessions').doc('session-hm898y4nq').get());
    await assertFails(unauthDb.collection('sessions').doc('session-hm898y4nq').set({ chat: 'hello' }));
    await assertFails(unauthDb.collection('lobbyPresence').doc('session-hm898y4nq').collection('active').doc('user1').get());
    await assertFails(unauthDb.collection('lobbyPresence').doc('session-hm898y4nq').collection('active').doc('user1').set({ heartbeat: Date.now() }));
    await assertFails(unauthDb.collection('joinRequests').doc('req1').get());
    await assertFails(unauthDb.collection('joinRequests').doc('req1').set({ status: 'pending' }));
    await assertFails(unauthDb.collection('occupancy').doc('pass1').get());
    await assertFails(unauthDb.collection('occupancy').doc('pass1').set({ active: true }));
    await assertFails(unauthDb.collection('guestPasses').doc('pass1').get());
    await assertFails(unauthDb.collection('joinTokens').doc('token1').get());
    await assertFails(unauthDb.collection('rateLimits').doc('limit1').get());
    await assertFails(unauthDb.collection('deliveryQueue').doc('del1').get());
    await assertFails(unauthDb.collection('agentLogs').doc('log1').get());
    await assertFails(unauthDb.collection('anyRandomFutureCollection').doc('doc1').get());
  });

  await t.test('2. Authenticated anonymous classroom clients can read and write sessions & presence', async () => {
    const anonDb = testEnv.authenticatedContext('anon_user_12345').firestore();

    // Sessions read & write
    await assertSucceeds(anonDb.collection('sessions').doc('session-hm898y4nq').set({
      title: 'Music Fun Live Session',
      chat: [{ text: 'Hello class' }],
      updatedAt: Date.now(),
    }));
    await assertSucceeds(anonDb.collection('sessions').doc('session-hm898y4nq').get());

    // Presence (subcollection match) read & write
    await assertSucceeds(anonDb.collection('lobbyPresence').doc('session-hm898y4nq').collection('active').doc('anon_user_12345').set({
      heartbeatAt: Date.now(),
    }));
    await assertSucceeds(anonDb.collection('lobbyPresence').doc('session-hm898y4nq').collection('active').doc('anon_user_12345').get());

    // JoinRequests read & write
    await assertSucceeds(anonDb.collection('joinRequests').doc('session-hm898y4nq_pass1').set({
      status: 'pending',
      adultName: 'Sarah',
    }));
    await assertSucceeds(anonDb.collection('joinRequests').doc('session-hm898y4nq_pass1').get());
  });

  await t.test('3. Live Occupancy is read-only for clients (writes blocked)', async () => {
    await testEnv.withSecurityRulesDisabled(async (adminCtx) => {
      await adminCtx.firestore().collection('occupancy').doc('pass_999').set({
        sessionId: 'session-hm898y4nq',
        connectionId: 'conn_abc',
        lastHeartbeat: Date.now(),
      });
    });

    const anonDb = testEnv.authenticatedContext('anon_user_12345').firestore();

    // Client read is allowed
    await assertSucceeds(anonDb.collection('occupancy').doc('pass_999').get());

    // Client write is blocked (server-only via Cloud Functions)
    await assertFails(anonDb.collection('occupancy').doc('pass_999').set({
      connectionId: 'malicious_client_overwrite',
    }));
  });

  await t.test('4. Sensitive collections remain closed even to authenticated clients', async () => {
    const anonDb = testEnv.authenticatedContext('anon_user_12345').firestore();

    await assertFails(anonDb.collection('guestPasses').doc('pass_1').get());
    await assertFails(anonDb.collection('guestPasses').doc('pass_1').set({ email: 'fake@example.com' }));
    await assertFails(anonDb.collection('joinTokens').doc('token_1').get());
    await assertFails(anonDb.collection('joinTokens').doc('token_1').set({ used: false }));
    await assertFails(anonDb.collection('rateLimits').doc('limit_1').get());
    await assertFails(anonDb.collection('rateLimits').doc('limit_1').set({ count: 0 }));
    await assertFails(anonDb.collection('deliveryQueue').doc('del_1').get());
    await assertFails(anonDb.collection('deliveryQueue').doc('del_1').set({ phone: '123' }));
    await assertFails(anonDb.collection('agentLogs').doc('log_1').get());
    await assertFails(anonDb.collection('agentLogs').doc('log_1').set({ log: 'fake' }));
  });
});
