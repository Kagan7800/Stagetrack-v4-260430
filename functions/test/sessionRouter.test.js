'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { getRecordingSignedUrlHandler } = require('../recordings');

test('Session Router — Task 4 Extended Acceptance & Boundary Tests', async (t) => {
  // Import pure state evaluation engine directly from single source of truth in src/utils/
  const { evaluateSessionState, SESSION_STATES, toMillis } = await import('../../src/utils/sessionRouterLogic.js');

  await t.test('NO_SESSION — gracefully handles null, undefined, or empty session without crashing', () => {
    const noSessionNull = evaluateSessionState(null);
    assert.equal(noSessionNull.state, SESSION_STATES.NO_SESSION);
    assert.ok(noSessionNull.message.includes('No upcoming session'));

    const noSessionUndefined = evaluateSessionState(undefined);
    assert.equal(noSessionUndefined.state, SESSION_STATES.NO_SESSION);

    const noSessionEmpty = evaluateSessionState({});
    assert.equal(noSessionEmpty.state, SESSION_STATES.NO_SESSION);

    const noSessionGarbage = evaluateSessionState('not-an-object');
    assert.equal(noSessionGarbage.state, SESSION_STATES.NO_SESSION);
  });

  await t.test('toMillis helper — parses Firestore Timestamp, Date, string, and number formats', () => {
    assert.equal(toMillis(1774000000000), 1774000000000);
    assert.equal(toMillis(new Date(1774000000000)), 1774000000000);
    assert.equal(toMillis({ toMillis: () => 1774000000000 }), 1774000000000);
    assert.equal(toMillis({ seconds: 1774000000, nanoseconds: 0 }), 1774000000000);
    assert.equal(toMillis('2026-03-20T00:00:00.000Z'), Date.parse('2026-03-20T00:00:00.000Z'));
    assert.equal(toMillis(null), null);
    assert.equal(toMillis(undefined), null);
    assert.equal(toMillis('invalid-date'), null);
  });

  await t.test('Boundary Precision — exact millisecond transitions', () => {
    const lobbyOpensAt = 1774000000000;
    const startsAt = lobbyOpensAt + 15 * 60 * 1000;
    const endsAt = startsAt + 45 * 60 * 1000;
    const recordingExpires = endsAt + 7 * 24 * 60 * 60 * 1000;

    const session = {
      programId: 'spring-2026',
      lobbyOpensAt,
      startsAt,
      endsAt,
      recordingExpires,
      recordingPath: 'recordings/rec_1.mp4',
    };

    // 1. One ms before lobby opens -> COUNTDOWN
    assert.equal(evaluateSessionState(session, lobbyOpensAt - 1).state, SESSION_STATES.COUNTDOWN);

    // 2. Exactly at lobbyOpensAt -> LOBBY
    assert.equal(evaluateSessionState(session, lobbyOpensAt).state, SESSION_STATES.LOBBY);

    // 3. Middle of live class -> LOBBY
    assert.equal(evaluateSessionState(session, startsAt + 10 * 60 * 1000).state, SESSION_STATES.LOBBY);

    // 4. One ms before class ends -> LOBBY
    assert.equal(evaluateSessionState(session, endsAt - 1).state, SESSION_STATES.LOBBY);

    // 5. Exactly at endsAt -> RECORDING (recordingPath present)
    assert.equal(evaluateSessionState(session, endsAt).state, SESSION_STATES.RECORDING);

    // 5b. Exactly at endsAt with null recording -> PROCESSING
    const processingSession = { ...session, recordingPath: null };
    assert.equal(evaluateSessionState(processingSession, endsAt).state, SESSION_STATES.PROCESSING);

    // 6. Exactly at recordingExpires -> RECORDING
    assert.equal(evaluateSessionState(session, recordingExpires).state, SESSION_STATES.RECORDING);

    // 7. One ms past recordingExpires -> EXPIRED
    assert.equal(evaluateSessionState(session, recordingExpires + 1).state, SESSION_STATES.EXPIRED);
  });

  await t.test('Signed Recording URLs (§4.8) — negative authorization matrix', async () => {
    const sessionDoc = {
      programId: 'summer-2026',
      recordingPath: 'recordings/summer-session-1.mp4',
      recordingExpires: 1775000000000,
    };

    const mockDb = {
      collection(colName) {
        return {
          doc(docId) {
            return {
              async get() {
                if (docId === 'sess_valid') {
                  return { exists: true, data: () => ({ ...sessionDoc }) };
                }
                if (docId === 'sess_no_rec') {
                  return { exists: true, data: () => ({ ...sessionDoc, recordingPath: null }) };
                }
                if (docId === 'sess_expired') {
                  return { exists: true, data: () => ({ ...sessionDoc, recordingExpires: 1773000000000 }) };
                }
                return { exists: false };
              },
            };
          },
        };
      },
    };

    const mockStorage = {
      bucket() {
        return {
          file(path) {
            return {
              async getSignedUrl(opts) {
                return [`https://storage.googleapis.com/test-bucket/${path}?sig=test`];
              },
            };
          },
        };
      },
    };

    // 1. Missing context or auth
    await assert.rejects(
      async () => getRecordingSignedUrlHandler({ sessionId: 'sess_valid' }, null, { db: mockDb, storage: mockStorage }),
      (err) => err.code === 'unauthenticated'
    );
    await assert.rejects(
      async () => getRecordingSignedUrlHandler({ sessionId: 'sess_valid' }, { auth: null }, { db: mockDb, storage: mockStorage }),
      (err) => err.code === 'unauthenticated'
    );

    // 2. Missing or invalid sessionId
    await assert.rejects(
      async () => getRecordingSignedUrlHandler({}, { auth: { uid: 'u1', token: { programId: 'summer-2026' } } }, { db: mockDb, storage: mockStorage }),
      (err) => err.code === 'invalid-argument'
    );

    // 3. Non-existent session
    await assert.rejects(
      async () => getRecordingSignedUrlHandler({ sessionId: 'does_not_exist' }, { auth: { uid: 'u1', token: { programId: 'summer-2026' } } }, { db: mockDb, storage: mockStorage }),
      (err) => err.code === 'not-found'
    );

    // 4. Program ID mismatch (unauthorized caller)
    await assert.rejects(
      async () => getRecordingSignedUrlHandler(
        { sessionId: 'sess_valid' },
        { auth: { uid: 'intruder', token: { programId: 'other-program' } } },
        { db: mockDb, storage: mockStorage }
      ),
      (err) => err.code === 'permission-denied'
    );

    // 5. No recording uploaded yet -> failed-precondition
    await assert.rejects(
      async () => getRecordingSignedUrlHandler(
        { sessionId: 'sess_no_rec' },
        { auth: { uid: 'u1', token: { programId: 'summer-2026' } } },
        { db: mockDb, storage: mockStorage }
      ),
      (err) => err.code === 'failed-precondition'
    );

    // 6. Expired recording -> deadline-exceeded
    await assert.rejects(
      async () => getRecordingSignedUrlHandler(
        { sessionId: 'sess_expired' },
        { auth: { uid: 'u1', token: { programId: 'summer-2026' } } },
        { db: mockDb, storage: mockStorage, now: () => 1774000000000 }
      ),
      (err) => err.code === 'deadline-exceeded'
    );

    // 7. Happy path: matching programId -> success
    const result = await getRecordingSignedUrlHandler(
      { sessionId: 'sess_valid' },
      { auth: { uid: 'u1', token: { programId: 'summer-2026' } } },
      { db: mockDb, storage: mockStorage, now: () => 1774000000000 }
    );
    assert.ok(result.signedUrl);
    assert.equal(result.expiresAt, 1774000000000 + 30 * 60 * 1000);

    // 8. Admin override -> success even if programId claim is absent
    const adminResult = await getRecordingSignedUrlHandler(
      { sessionId: 'sess_valid' },
      { auth: { uid: 'admin_user', token: { admin: true } } },
      { db: mockDb, storage: mockStorage, now: () => 1774000000000 }
    );
    assert.ok(adminResult.signedUrl);
  });

  await t.test('Component Smoke Tests — verify component files exist and export expected components', () => {
    const fs = require('fs');
    const path = require('path');

    const componentFiles = [
      'SessionRouter.jsx',
      'SessionCountdown.jsx',
      'SessionProcessingNotice.jsx',
      'SessionRecordingPlayer.jsx',
      'SessionExpiredNotice.jsx',
    ];

    for (const comp of componentFiles) {
      const fullPath = path.resolve(__dirname, '../../src/components', comp);
      assert.ok(fs.existsSync(fullPath), `Component file ${comp} must exist`);
      const content = fs.readFileSync(fullPath, 'utf8');
      assert.ok(content.includes('export default function'), `${comp} must export a default function`);
    }
  });

});
