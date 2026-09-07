'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { redeemPassHandler } = require('../redeem');
const { generateToken, hashToken } = require('../tokens');
const { checkRateLimit, IP_LIMIT_PER_MINUTE } = require('../rateLimiter');

/**
 * Creates an in-memory mock Firestore instance for redeem testing,
 * fully supporting Firestore FieldValue transforms (increment, arrayUnion, serverTimestamp).
 */
function createRedeemMockDb() {
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
                if (v && typeof v === 'object') {
                  const constructorName = v.constructor?.name;
                  if (v.operand !== undefined || constructorName === 'NumericIncrementTransform') {
                    const inc = v.operand !== undefined ? v.operand : 1;
                    current[k] = (typeof current[k] === 'number' ? current[k] : 0) + inc;
                    continue;
                  }
                  if (Array.isArray(v.elements) || constructorName === 'ArrayUnionTransform') {
                    const elements = Array.isArray(v.elements) ? v.elements : (v.val ? [v.val] : []);
                    current[k] = Array.isArray(current[k]) ? [...current[k]] : [];
                    for (const elem of elements) {
                      if (!current[k].includes(elem)) {
                        current[k].push(elem);
                      }
                    }
                    continue;
                  }
                  if (constructorName === 'ServerTimestampTransform') {
                    current[k] = new Date();
                    continue;
                  }
                }
                current[k] = v;
              }
              store.set(key, current);
            },
          };
        },
        where(field, op, value) {
          return {
            limit(n) {
              return {
                async get() {
                  const matches = [];
                  for (const [k, docData] of store.entries()) {
                    if (k.startsWith(`${colName}/`) && docData[field] === value) {
                      const docId = k.split('/')[1];
                      matches.push({
                        id: docId,
                        ref: mockDb.collection(colName).doc(docId),
                        data: () => ({ ...docData }),
                      });
                    }
                  }
                  const limited = n ? matches.slice(0, n) : matches;
                  return {
                    empty: limited.length === 0,
                    docs: limited,
                  };
                },
              };
            },
          };
        },
      };
    },
    async runTransaction(updateFn) {
      const transaction = {
        async get(docRef) {
          return docRef.get();
        },
        set(docRef, data, opts) {
          return docRef.set(data, opts);
        },
      };
      return updateFn(transaction);
    },
  };

  return mockDb;
}

/**
 * Creates a mock Express response object for testing.
 */
function createMockRes() {
  const res = {
    statusCode: 200,
    headers: {},
    body: '',
    status(code) {
      res.statusCode = code;
      return res;
    },
    set(key, value) {
      res.headers[key.toLowerCase()] = value;
      return res;
    },
    setHeader(key, value) {
      res.headers[key.toLowerCase()] = value;
      return res;
    },
    send(data) {
      res.body = data;
      return res;
    },
  };
  return res;
}

/**
 * Creates a mock Firebase Admin Auth instance.
 */
function createMockAuth() {
  const mintCalls = [];
  return {
    _mintCalls: mintCalls,
    async createCustomToken(uid, claims) {
      mintCalls.push({ uid, claims });
      return `custom_jwt_${uid}_${Date.now()}`;
    },
  };
}

test('Redeem Endpoint — Task 3 Acceptance Tests', async (t) => {

  await t.test('Successful Redemption — decoupled UID minting, counters, cookies, and token secrecy', async () => {
    const db = createRedeemMockDb();
    const auth = createMockAuth();

    const rawToken = generateToken(32);
    const storedHash = hashToken(rawToken);
    const passId = 'pass_alpha_1';
    const userUid = 'guest_user_99';

    // Seed active pass in Firestore
    db._store.set(`guestPasses/${passId}`, {
      uid: userUid,
      tokenHash: storedHash,
      programId: 'spring-2026',
      status: 'active',
      redeemCount: 0,
      knownDevices: [],
    });

    const req = {
      method: 'GET',
      path: `/my/${rawToken}`,
      params: { token: rawToken },
      ip: '192.168.1.100',
      headers: {},
    };
    const res = createMockRes();

    await redeemPassHandler(req, res, { db, auth });

    // 1. Response status and security headers
    assert.equal(res.statusCode, 200);
    assert.equal(res.headers['referrer-policy'], 'no-referrer');
    assert.ok(res.headers['cache-control'].includes('no-store'));

    // 2. Cookie issuance for Firebase Hosting pass-through (__session)
    assert.ok(res.headers['set-cookie'], 'Must set __session cookie');
    assert.ok(res.headers['set-cookie'].includes('__session='));
    assert.ok(res.headers['set-cookie'].includes('HttpOnly'));

    // 3. Custom token minted with decoupled pass.uid (NOT passId)
    assert.equal(auth._mintCalls.length, 1);
    const mintCall = auth._mintCalls[0];
    assert.equal(mintCall.uid, userUid, 'Custom token must be minted for user UID, not passId');
    assert.equal(mintCall.claims.passId, passId, 'passId must be present as a claim');
    assert.equal(mintCall.claims.programId, 'spring-2026');
    assert.equal(mintCall.claims.isGuest, true);

    // 4. Response Body Secrecy: contains custom token, NEVER contains raw token
    assert.ok(res.body.includes(res.body.match(/custom_jwt_guest_user_99_\d+/)[0]), 'HTML body must contain customToken');
    assert.equal(res.body.includes(rawToken), false, 'HTML body must NEVER contain the raw token string');

    // 5. Atomic increments in Firestore
    const updatedPass = db._store.get(`guestPasses/${passId}`);
    assert.equal(updatedPass.redeemCount, 1);
    assert.ok(Array.isArray(updatedPass.knownDevices));
    assert.equal(updatedPass.knownDevices.length, 1);
  });

  await t.test('Identical 404 Failure Matrix — not found, revoked, and malformed responses are byte-identical', async () => {
    const db = createRedeemMockDb();
    const auth = createMockAuth();

    // 1. Seed a revoked pass
    const revokedRaw = generateToken(32);
    db._store.set('guestPasses/revoked_pass', {
      uid: 'guest_revoked',
      tokenHash: hashToken(revokedRaw),
      programId: 'prog1',
      status: 'revoked',
      redeemCount: 5,
      knownDevices: [],
    });

    // Test Case A: Unknown / Not Found token
    const resNotFound = createMockRes();
    await redeemPassHandler(
      { method: 'GET', path: '/my/validLookinTokenThatDoesNotExist12345678901', ip: '10.0.0.1', headers: {} },
      resNotFound,
      { db, auth }
    );

    // Test Case B: Revoked pass
    const resRevoked = createMockRes();
    await redeemPassHandler(
      { method: 'GET', path: `/my/${revokedRaw}`, ip: '10.0.0.2', headers: {} },
      resRevoked,
      { db, auth }
    );

    // Test Case C: Malformed token
    const resMalformed = createMockRes();
    await redeemPassHandler(
      { method: 'GET', path: '/my/!@#$malformed', ip: '10.0.0.3', headers: {} },
      resMalformed,
      { db, auth }
    );

    // Assert identical status codes
    assert.equal(resNotFound.statusCode, 404);
    assert.equal(resRevoked.statusCode, 404);
    assert.equal(resMalformed.statusCode, 404);

    // Assert identical headers
    assert.equal(resNotFound.headers['referrer-policy'], 'no-referrer');
    assert.equal(resRevoked.headers['referrer-policy'], 'no-referrer');
    assert.equal(resMalformed.headers['referrer-policy'], 'no-referrer');

    // Assert 100% byte-identical response bodies (zero leakage)
    assert.equal(resNotFound.body, resRevoked.body, 'Not-found and revoked response bodies must be byte-identical');
    assert.equal(resNotFound.body, resMalformed.body, 'Not-found and malformed response bodies must be byte-identical');
  });

  await t.test('Rate Limiter — 429 separation with Retry-After and fail-open resilience', async () => {
    const db = createRedeemMockDb();
    const auth = createMockAuth();
    const ip = '203.0.113.42';

    // 1. First 20 requests allowed
    for (let i = 0; i < IP_LIMIT_PER_MINUTE; i++) {
      const check = await checkRateLimit(ip, db);
      assert.equal(check.allowed, true, `Request ${i + 1} must be allowed`);
    }

    // 2. 21st request is throttled
    const throttledCheck = await checkRateLimit(ip, db);
    assert.equal(throttledCheck.allowed, false);
    assert.equal(throttledCheck.retryAfterSeconds, 60);

    // 3. Redeem handler returns 429 with Retry-After
    const res429 = createMockRes();
    await redeemPassHandler(
      { method: 'GET', path: '/my/any_token', ip, headers: {} },
      res429,
      { db, auth }
    );

    assert.equal(res429.statusCode, 429);
    assert.equal(res429.headers['retry-after'], '60');
    assert.equal(res429.headers['referrer-policy'], 'no-referrer');

    // 4. Fail Open on database errors
    const errorDb = {
      collection() {
        throw new Error('Transient Firestore connection error');
      },
      async runTransaction() {
        throw new Error('Transaction failure');
      },
    };
    const failOpenResult = await checkRateLimit('198.51.100.1', errorDb);
    assert.equal(failOpenResult.allowed, true, 'Rate limiter must fail open during database errors');
  });

  await t.test('Scanner Safety — repeated redemption succeeds without burning the pass', async () => {
    const db = createRedeemMockDb();
    const auth = createMockAuth();

    const rawToken = generateToken(32);
    const passId = 'pass_scanner_test';

    db._store.set(`guestPasses/${passId}`, {
      uid: 'guest_scanner',
      tokenHash: hashToken(rawToken),
      programId: 'prog_scan',
      status: 'active',
      redeemCount: 0,
      knownDevices: [],
    });

    // Simulate corporate email scanner hitting the link 3 times, then parent clicking
    for (let i = 1; i <= 4; i++) {
      const res = createMockRes();
      await redeemPassHandler(
        { method: 'GET', path: `/my/${rawToken}`, ip: `10.0.1.${i}`, headers: {} },
        res,
        { db, auth }
      );
      assert.equal(res.statusCode, 200, `Redemption attempt ${i} must succeed`);
    }

    // Pass remains active with incremented counter
    const passDoc = db._store.get(`guestPasses/${passId}`);
    assert.equal(passDoc.status, 'active', 'Pass must remain active');
    assert.equal(passDoc.redeemCount, 4);
  });

  await t.test('Device Cookie — reuses existing __session cookie on subsequent visits', async () => {
    const db = createRedeemMockDb();
    const auth = createMockAuth();

    const rawToken = generateToken(32);
    const passId = 'pass_device_test';
    const existingDeviceId = generateToken(32);

    db._store.set(`guestPasses/${passId}`, {
      uid: 'guest_dev_user',
      tokenHash: hashToken(rawToken),
      programId: 'prog_dev',
      status: 'active',
      redeemCount: 0,
      knownDevices: [],
    });

    const req = {
      method: 'GET',
      path: `/my/${rawToken}`,
      ip: '10.0.0.50',
      headers: {
        cookie: `__session=${encodeURIComponent(JSON.stringify({ dev: existingDeviceId }))}; other_cookie=xyz`,
      },
    };
    const res = createMockRes();

    await redeemPassHandler(req, res, { db, auth });

    assert.equal(res.statusCode, 200);
    // Should NOT issue a new Set-Cookie since valid __session with dev was provided
    assert.equal(res.headers['set-cookie'], undefined);

    const updatedPass = db._store.get(`guestPasses/${passId}`);
    assert.ok(Array.isArray(updatedPass.knownDevices));
    assert.ok(updatedPass.knownDevices.includes(hashToken(existingDeviceId)));
  });

});
