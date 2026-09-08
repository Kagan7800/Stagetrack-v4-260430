import { useState, useEffect, useRef, useCallback } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getFirestore, doc, onSnapshot } from 'firebase/firestore';

export const RETRY_DELAYS_MS = [1000, 2000, 4000];

/**
 * Classifies an error as transient (retryable) or permanent.
 * @param {any} err
 * @returns {boolean}
 */
export function isTransientOccupancyError(err) {
  if (!err) return false;
  const transientCodes = new Set([
    'not-found',
    'aborted',
    'unavailable',
    'deadline-exceeded',
    'resource-exhausted',
  ]);
  if (err.code && transientCodes.has(err.code)) {
    return true;
  }
  if (err instanceof TypeError && err.message?.includes('Failed to fetch')) {
    return true;
  }
  if (err.message && (err.message.includes('Failed to fetch') || err.message.includes('NetworkError'))) {
    return true;
  }
  return false;
}

/**
 * Executes join token minting and occupancy slot claiming with exponential backoff and jitter for transient errors.
 * @param {object} params
 * @param {string} params.sessionId
 * @param {string} params.passId
 * @param {string} params.connectionId
 * @param {boolean} [params.forceTransfer=false]
 * @param {object} [params.deps={}]
 * @returns {Promise<any>}
 */
export async function executeClaimWithRetry({
  sessionId,
  passId,
  connectionId,
  forceTransfer = false,
  deps = {},
}) {
  const mintFn = deps.mintFn || ((args) => httpsCallable(getFunctions(), 'mintJoinToken')(args));
  const claimFn = deps.claimFn || ((args) => httpsCallable(getFunctions(), 'claimOccupancySlot')(args));
  const sleep = deps.sleep || ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));

  let lastError;
  const maxAttempts = 3;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      // Step 1: Mint Join Token
      const mintRes = await mintFn({ sessionId });
      const rawJoinToken = mintRes?.data?.joinToken;

      if (!rawJoinToken) {
        throw new Error('Failed to obtain a valid join token.');
      }

      // Step 2: Claim Occupancy Slot
      const claimRes = await claimFn({
        sessionId,
        connectionId,
        joinToken: rawJoinToken,
        forceTransfer,
      });

      return claimRes?.data;
    } catch (err) {
      lastError = err;
      if (!isTransientOccupancyError(err)) {
        throw err;
      }
      if (attempt < maxAttempts - 1) {
        const baseDelay = RETRY_DELAYS_MS[attempt] || 1000;
        const jitter = Math.floor(Math.random() * 300);
        await sleep(baseDelay + jitter);
      }
    }
  }

  throw lastError;
}

/**
 * Pure predicate determining whether auto-claim should trigger.
 * Prevents re-claiming after deliberate user dismissal/exit.
 * @param {object} params
 * @param {boolean} params.isAdmitted
 * @param {string} params.occupancyState
 * @param {boolean} params.hasClaimed
 * @param {boolean} [params.isDismissed]
 * @returns {boolean}
 */
export function shouldTriggerAutoClaim({ isAdmitted, occupancyState, hasClaimed, isDismissed }) {
  if (isDismissed) return false;
  return Boolean(isAdmitted && occupancyState === 'idle' && !hasClaimed);
}

/**
 * Custom hook to manage single-stream exclusivity and join token lifecycle (§5 Task 6).
 * Follows strict flow: Mint Join Token -> Claim Occupancy Slot -> (Caller initializes WebRTC).
 * Subscribes in real-time to occupancy/{passId} for instant displacement.
 * Runs 15-second heartbeats and unregisters via pagehide/visibilitychange.
 *
 * @param {object} params
 * @param {string} params.sessionId
 * @param {string} params.passId
 * @param {boolean} params.isAdmitted
 * @param {boolean} [params.isDismissed=false]
 * @returns {object}
 */
export function useSessionOccupancy({ sessionId, passId, isAdmitted, isDismissed = false }) {
  const [occupancyState, setOccupancyState] = useState('idle'); // 'idle' | 'claiming' | 'connected' | 'occupied_conflict' | 'displaced' | 'error'
  const [errorMessage, setErrorMessage] = useState(null);
  const [activeConnectionId, setActiveConnectionId] = useState(null);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  const connectionIdRef = useRef(
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `conn_${Math.random().toString(36).substring(2, 15)}`
  );
  const heartbeatTimerRef = useRef(null);
  const hasClaimedRef = useRef(false);

  // 1. Claim Occupancy Handler
  const claimSlot = useCallback(
    async (forceTransfer = false) => {
      if (!sessionId || !passId) return;

      try {
        setOccupancyState('claiming');
        setErrorMessage(null);

        const functions = getFunctions();
        const mintJoinTokenFn = httpsCallable(functions, 'mintJoinToken');
        const claimFn = httpsCallable(functions, 'claimOccupancySlot');

        const result = await executeClaimWithRetry({
          sessionId,
          passId,
          connectionId: connectionIdRef.current,
          forceTransfer,
          deps: {
            mintFn: (args) => mintJoinTokenFn(args),
            claimFn: (args) => claimFn(args),
          },
        });

        if (result?.status === 'occupied') {
          setActiveConnectionId(result.currentConnectionId);
          setOccupancyState('occupied_conflict');
          return { status: 'occupied', currentConnectionId: result.currentConnectionId };
        }

        if (result?.status === 'connected') {
          hasClaimedRef.current = true;
          setOccupancyState('connected');
          return { status: 'connected' };
        }

        throw new Error('Unexpected claim response status.');
      } catch (err) {
        console.error('Occupancy claim failed:', err);
        setErrorMessage(err.message || 'Failed to connect to the session.');
        setOccupancyState('error');
        return { status: 'error', error: err };
      }
    },
    [sessionId, passId]
  );

  // Retry claim handler (guarded to error state only)
  const retryClaim = useCallback(
    async () => {
      if (occupancyState !== 'error') {
        return;
      }
      return claimSlot(false);
    },
    [occupancyState, claimSlot]
  );

  // 2. Real-time Displacement Subscription (pass owner read)
  useEffect(() => {
    if (!passId || occupancyState !== 'connected') return;

    const db = getFirestore();
    const occDocRef = doc(db, 'occupancy', passId);

    const unsubscribe = onSnapshot(
      occDocRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          // If connectionId changed on the server, instant displacement!
          if (data.connectionId && data.connectionId !== connectionIdRef.current) {
            console.warn('[Occupancy] Displaced by another device connection in real-time');
            setOccupancyState('displaced');
            if (heartbeatTimerRef.current) {
              clearInterval(heartbeatTimerRef.current);
            }
          }
        }
      },
      (err) => {
        console.warn('[Occupancy] Snapshot subscription warning:', err);
      }
    );

    return () => unsubscribe();
  }, [passId, occupancyState]);

  // 3. 15-second Heartbeat Timer
  useEffect(() => {
    if (occupancyState !== 'connected' || !passId || !sessionId) return;

    const functions = getFunctions();
    const heartbeatFn = httpsCallable(functions, 'heartbeatOccupancy');

    const sendHeartbeat = async () => {
      try {
        const res = await heartbeatFn({
          sessionId,
          connectionId: connectionIdRef.current,
        });
        if (res.data?.status === 'displaced') {
          setOccupancyState('displaced');
        }
      } catch (err) {
        console.warn('[Occupancy] Heartbeat failed:', err);
      }
    };

    heartbeatTimerRef.current = setInterval(sendHeartbeat, 15000); // 15s cadence

    return () => {
      if (heartbeatTimerRef.current) {
        clearInterval(heartbeatTimerRef.current);
      }
    };
  }, [occupancyState, passId, sessionId]);

  // 4. Mobile Lifecycle Cleanup (pagehide & visibilitychange)
  useEffect(() => {
    const handleRelease = () => {
      if (hasClaimedRef.current && passId) {
        try {
          const functions = getFunctions();
          const releaseFn = httpsCallable(functions, 'releaseOccupancySlot');
          releaseFn({ connectionId: connectionIdRef.current });
        } catch (e) {
          // Best-effort cleanup; 45s staleness threshold is backstop
        }
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        // Optional: on long backgrounding, mobile OS may suspend
      }
    };

    window.addEventListener('pagehide', handleRelease);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('pagehide', handleRelease);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      handleRelease();
    };
  }, [passId]);

  // 5. Trigger Initial Claim when Admitted
  useEffect(() => {
    if (
      shouldTriggerAutoClaim({
        isAdmitted,
        occupancyState,
        hasClaimed: hasClaimedRef.current,
        isDismissed,
      })
    ) {
      claimSlot(false);
    }
  }, [isAdmitted, occupancyState, isDismissed, claimSlot]);

  return {
    occupancyState,
    errorMessage,
    connectionId: connectionIdRef.current,
    claimSlot,
    retryClaim,
    cooldownSeconds,
  };
}
