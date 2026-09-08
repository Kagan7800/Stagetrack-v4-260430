import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { shouldAttachSessionListener } from '../src/utils/sessionSync.js';

describe('AppContext Session Listener Lifecycle & Auth Guard Tests', () => {
  test('blocks listener on cold mount when currentUser is null (prevents PERMISSION_DENIED race)', () => {
    assert.equal(
      shouldAttachSessionListener({ sessionId: 'session-hm898y4nq', currentUser: null }),
      false
    );
  });

  test('blocks listener when currentUser is undefined', () => {
    assert.equal(
      shouldAttachSessionListener({ sessionId: 'session-hm898y4nq', currentUser: undefined }),
      false
    );
  });

  test('blocks listener when sessionId is missing or empty', () => {
    assert.equal(shouldAttachSessionListener({ sessionId: '', currentUser: { uid: 'anon_123' } }), false);
    assert.equal(shouldAttachSessionListener({ sessionId: null, currentUser: { uid: 'anon_123' } }), false);
  });

  test('allows listener when both sessionId and currentUser are resolved', () => {
    assert.equal(shouldAttachSessionListener({ sessionId: 'session-hm898y4nq', currentUser: { uid: 'anon_123' } }), true);
  });
});
