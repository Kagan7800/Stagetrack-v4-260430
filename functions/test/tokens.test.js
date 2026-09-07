'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const { generateToken, hashToken, safeHashToken, verifyToken } = require('../tokens');

test('Token Utilities — Task 1 Acceptance Tests (Amended & Boundary-Safe)', async (t) => {

  await t.test('generateToken — default 32 bytes entropy and format', () => {
    const token = generateToken();
    assert.equal(typeof token, 'string', 'Token must be a string');
    
    // Default entropy must be 32 bytes (256 bits), yielding a 43-char base64url string
    const decodedBuffer = Buffer.from(token, 'base64url');
    assert.equal(decodedBuffer.length, 32, 'Default token entropy must be 32 bytes (256 bits)');
    assert.equal(token.length, 43, '32-byte base64url string must be 43 characters long');

    // Enforces floor of 16 bytes even if lower number is passed
    const tokenSmall = generateToken(8);
    const decodedSmall = Buffer.from(tokenSmall, 'base64url');
    assert.equal(decodedSmall.length, 16, 'Should enforce floor of 16 bytes');
  });

  await t.test('generateToken — URL-safety lock-in (no +, /, =, whitespace)', () => {
    // Check 500 generated tokens to lock in that no invalid chars ever appear
    for (let i = 0; i < 500; i++) {
      const token = generateToken();
      assert.match(token, /^[A-Za-z0-9_-]+$/, 'Token must match base64url charset exclusively');
      assert.equal(token.includes('+'), false, 'Token must not contain +');
      assert.equal(token.includes('/'), false, 'Token must not contain /');
      assert.equal(token.includes('='), false, 'Token must not contain =');
      assert.equal(/\s/.test(token), false, 'Token must not contain whitespace');
    }
  });

  await t.test('generateToken — uniqueness check across samples', () => {
    const tokens = new Set();
    const count = 1000;
    for (let i = 0; i < count; i++) {
      tokens.add(generateToken());
    }
    assert.equal(tokens.size, count, `All ${count} generated tokens must be unique`);
  });

  await t.test('hashToken — SHA-256 hex digest stability and type safety', () => {
    const raw = 'test-token-value-12345';
    const expectedHash = crypto.createHash('sha256').update(raw).digest('hex');
    const computedHash = hashToken(raw);

    assert.equal(computedHash, expectedHash, 'hashToken must match standard crypto SHA-256 hex output');
    assert.equal(computedHash.length, 64, 'SHA-256 hex string must be 64 characters long');
    assert.match(computedHash, /^[0-9a-f]{64}$/, 'Hash must contain only lowercase hex characters');
    assert.notEqual(computedHash, raw, 'Hash must never equal the raw token');

    // Deterministic stability: identical input always yields identical hash
    assert.equal(hashToken(raw), hashToken(raw));

    // Reject non-string, empty, null, undefined up front with TypeError
    assert.throws(() => hashToken(''), { name: 'TypeError' }, 'Empty string must throw TypeError');
    assert.throws(() => hashToken(null), { name: 'TypeError' }, 'null must throw TypeError');
    assert.throws(() => hashToken(undefined), { name: 'TypeError' }, 'undefined must throw TypeError');
    assert.throws(() => hashToken(12345), { name: 'TypeError' }, 'Number must throw TypeError');
    assert.throws(() => hashToken({}), { name: 'TypeError' }, 'Object must throw TypeError');
  });

  await t.test('safeHashToken — boundary-safe helper returns null on invalid input', () => {
    const raw = 'test-token-value-12345';
    const expectedHash = crypto.createHash('sha256').update(raw).digest('hex');
    assert.equal(safeHashToken(raw), expectedHash, 'Valid string returns SHA-256 hex');

    // Boundary cases return null instead of throwing
    assert.equal(safeHashToken(''), null, 'Empty string returns null');
    assert.equal(safeHashToken(null), null, 'null returns null');
    assert.equal(safeHashToken(undefined), null, 'undefined returns null');
    assert.equal(safeHashToken(12345), null, 'Number returns null');
    assert.equal(safeHashToken({}), null, 'Object returns null');
    assert.equal(safeHashToken([]), null, 'Array returns null');
  });

  await t.test('verifyToken — input matrix, length mismatch resilience & correct booleans', () => {
    const raw = generateToken();
    const validHash = hashToken(raw);
    const otherRaw = generateToken();
    const otherHash = hashToken(otherRaw);

    // Matching token & hash
    assert.equal(verifyToken(raw, validHash), true, 'Valid match must return true');

    // Non-matching token / hash
    assert.equal(verifyToken(otherRaw, validHash), false, 'Mismatched token must return false');
    assert.equal(verifyToken(raw, otherHash), false, 'Mismatched hash must return false');

    // Tampered hash (single character flip)
    const tamperedHash = (validHash[0] === 'a' ? 'b' : 'a') + validHash.slice(1);
    assert.equal(verifyToken(raw, tamperedHash), false, 'Tampered hash must return false');

    // Safe length mismatch and malformed input handling without throwing
    assert.equal(verifyToken(raw, ''), false, 'Empty hash must return false without throwing');
    assert.equal(verifyToken('', validHash), false, 'Empty token must return false without throwing');
    assert.equal(verifyToken(raw, 'not-a-valid-hex-hash'), false, 'Non-hex string must return false');
    assert.equal(verifyToken(raw, validHash.slice(0, 32)), false, 'Truncated hash must return false');
    assert.equal(verifyToken(raw, validHash + '00'), false, 'Overlength hash must return false');

    // Non-string inputs rejected up front
    assert.equal(verifyToken(null, validHash), false);
    assert.equal(verifyToken(raw, null), false);
    assert.equal(verifyToken(undefined, undefined), false);
    assert.equal(verifyToken(12345, validHash), false);
    assert.equal(verifyToken({}, validHash), false);
    assert.equal(verifyToken(raw, {}), false);
  });

  await t.test('verifyToken — byte-exact comparison (no trimming or case folding)', () => {
    const raw = generateToken();
    const validHash = hashToken(raw);

    // Leading / trailing whitespace must NOT be normalized or trimmed
    assert.equal(verifyToken(` ${raw}`, validHash), false, 'Leading whitespace must fail');
    assert.equal(verifyToken(`${raw} `, validHash), false, 'Trailing whitespace must fail');
    assert.equal(verifyToken(`\n${raw}`, validHash), false, 'Newline must fail');

    // Case variations must NOT match (base64url is case-sensitive)
    const toggledCase = raw.split('').map(c => (c === c.toLowerCase() ? c.toUpperCase() : c.toLowerCase())).join('');
    if (toggledCase !== raw) {
      assert.equal(verifyToken(toggledCase, validHash), false, 'Case-altered token must fail');
    }
  });

  await t.test('verifyToken — delegates to crypto.timingSafeEqual when buffer lengths match', () => {
    let timingSafeEqualCalled = false;
    const originalTimingSafeEqual = crypto.timingSafeEqual;
    
    try {
      crypto.timingSafeEqual = function (a, b) {
        timingSafeEqualCalled = true;
        return originalTimingSafeEqual.call(crypto, a, b);
      };

      const raw = generateToken();
      const validHash = hashToken(raw);
      const result = verifyToken(raw, validHash);

      assert.equal(result, true);
      assert.equal(timingSafeEqualCalled, true, 'crypto.timingSafeEqual should be executed');
    } finally {
      crypto.timingSafeEqual = originalTimingSafeEqual;
    }
  });

});
