import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  isTransientOccupancyError,
  executeClaimWithRetry,
  shouldTriggerAutoClaim,
  RETRY_DELAYS_MS,
  MANUAL_RETRY_COOLDOWN_MS,
} from '../src/hooks/useSessionOccupancy.js';

describe('Review B: useSessionOccupancy Unit & State Machine Tests', () => {
  describe('1. Error Classification (Transient vs Permanent)', () => {
    test('isTransientOccupancyError classifies transient errors (including not-found)', () => {
      assert.equal(isTransientOccupancyError({ code: 'not-found' }), true);
      assert.equal(isTransientOccupancyError({ code: 'aborted' }), true);
      assert.equal(isTransientOccupancyError({ code: 'unavailable' }), true);
      assert.equal(isTransientOccupancyError({ code: 'deadline-exceeded' }), true);
      assert.equal(isTransientOccupancyError({ code: 'resource-exhausted' }), true);
      assert.equal(isTransientOccupancyError(new TypeError('Failed to fetch')), true);
      assert.equal(isTransientOccupancyError(new Error('NetworkError when attempting to fetch resource')), true);
    });

    test('isTransientOccupancyError classifies permanent errors correctly', () => {
      assert.equal(isTransientOccupancyError({ code: 'permission-denied' }), false);
      assert.equal(isTransientOccupancyError({ code: 'unauthenticated' }), false);
      assert.equal(isTransientOccupancyError({ code: 'failed-precondition' }), false);
      assert.equal(isTransientOccupancyError({ code: 'invalid-argument' }), false);
    });
  });

  describe('2. Retry Loop & Exponential Backoff Engine', () => {
    test('executeClaimWithRetry retries transient errors and succeeds on recovery', async () => {
      let attempts = 0;
      const sleepDelays = [];

      const mockDeps = {
        mintFn: async () => {
          attempts++;
          if (attempts < 3) {
            const err = new Error('Transient contention');
            err.code = 'aborted';
            throw err;
          }
          return { data: { joinToken: 'raw_valid_token_abc' } };
        },
        claimFn: async () => {
          return { data: { status: 'connected' } };
        },
        sleep: async (ms) => {
          sleepDelays.push(ms);
        },
      };

      const result = await executeClaimWithRetry({
        sessionId: 'sess_test_1',
        passId: 'pass_test_1',
        connectionId: 'conn_1',
        forceTransfer: false,
        deps: mockDeps,
      });

      assert.equal(attempts, 3);
      assert.equal(result.status, 'connected');
      assert.equal(sleepDelays.length, 2);
      assert.ok(sleepDelays[0] >= RETRY_DELAYS_MS[0] && sleepDelays[0] <= RETRY_DELAYS_MS[0] + 300);
      assert.ok(sleepDelays[1] >= RETRY_DELAYS_MS[1] && sleepDelays[1] <= RETRY_DELAYS_MS[1] + 300);
    });

    test('executeClaimWithRetry executes 3 attempts on persistent transient error then throws', async () => {
      let attempts = 0;
      const sleepDelays = [];

      const mockDeps = {
        mintFn: async () => {
          attempts++;
          const err = new Error('Admission doc not found yet');
          err.code = 'not-found';
          throw err;
        },
        claimFn: async () => ({ data: { status: 'connected' } }),
        sleep: async (ms) => sleepDelays.push(ms),
      };

      await assert.rejects(
        async () => {
          await executeClaimWithRetry({
            sessionId: 'sess_test_persistent',
            passId: 'pass_test_persistent',
            connectionId: 'conn_pers',
            forceTransfer: false,
            deps: mockDeps,
          });
        },
        (err) => err.code === 'not-found'
      );

      // Must have attempted exactly 3 times before giving up
      assert.equal(attempts, 3);
      assert.equal(sleepDelays.length, 2);
      assert.ok(sleepDelays[0] >= RETRY_DELAYS_MS[0]);
      assert.ok(sleepDelays[1] >= RETRY_DELAYS_MS[1]);
    });

    test('executeClaimWithRetry fails fast on permission-denied with exactly 1 call', async () => {
      let attempts = 0;
      const sleepDelays = [];

      const mockDeps = {
        mintFn: async () => {
          attempts++;
          const err = new Error('Permission Denied');
          err.code = 'permission-denied';
          throw err;
        },
        claimFn: async () => ({ data: { status: 'connected' } }),
        sleep: async (ms) => sleepDelays.push(ms),
      };

      await assert.rejects(
        async () => {
          await executeClaimWithRetry({
            sessionId: 'sess_test_2',
            passId: 'pass_test_2',
            connectionId: 'conn_2',
            forceTransfer: false,
            deps: mockDeps,
          });
        },
        (err) => err.code === 'permission-denied'
      );

      // Must fail immediately on attempt 1 with zero sleep delays
      assert.equal(attempts, 1);
      assert.equal(sleepDelays.length, 0);
    });
  });

  describe('3. Deliberate Exit vs Re-Admission State Machine Invariant', () => {
    test('shouldTriggerAutoClaim blocks re-trigger when isDismissed is true even if isAdmitted is true', () => {
      const shouldTriggerOnExit = shouldTriggerAutoClaim({
        isAdmitted: true,
        occupancyState: 'idle',
        hasClaimed: false,
        isDismissed: true, // User clicked Return to Lobby
      });

      assert.equal(shouldTriggerOnExit, false);

      // Clean fresh admission (isDismissed is false) triggers correctly
      const shouldTriggerOnFreshAdmit = shouldTriggerAutoClaim({
        isAdmitted: true,
        occupancyState: 'idle',
        hasClaimed: false,
        isDismissed: false,
      });

      assert.equal(shouldTriggerOnFreshAdmit, true);
    });

    test('shouldTriggerAutoClaim requires occupancyState to be idle and hasClaimed to be false', () => {
      assert.equal(
        shouldTriggerAutoClaim({ isAdmitted: true, occupancyState: 'claiming', hasClaimed: false, isDismissed: false }),
        false
      );
      assert.equal(
        shouldTriggerAutoClaim({ isAdmitted: true, occupancyState: 'connected', hasClaimed: false, isDismissed: false }),
        false
      );
      assert.equal(
        shouldTriggerAutoClaim({ isAdmitted: true, occupancyState: 'error', hasClaimed: false, isDismissed: false }),
        false
      );
      assert.equal(
        shouldTriggerAutoClaim({ isAdmitted: true, occupancyState: 'idle', hasClaimed: true, isDismissed: false }),
        false
      );
      assert.equal(
        shouldTriggerAutoClaim({ isAdmitted: false, occupancyState: 'idle', hasClaimed: false, isDismissed: false }),
        false
      );
      assert.equal(
        shouldTriggerAutoClaim({ isAdmitted: true, occupancyState: 'idle', hasClaimed: false, isDismissed: false }),
        true
      );
    });
  });
});
