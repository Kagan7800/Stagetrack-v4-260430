import { useState, useEffect, useRef, useCallback } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getFirestore, doc, onSnapshot } from 'firebase/firestore';

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
 * @returns {object}
 */
export function useSessionOccupancy({ sessionId, passId, isAdmitted }) {
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

        // Step 1: Mint Join Token
        const mintJoinTokenFn = httpsCallable(functions, 'mintJoinToken');
        const mintRes = await mintJoinTokenFn({ sessionId });
        const rawJoinToken = mintRes.data?.joinToken;

        if (!rawJoinToken) {
          throw new Error('Failed to obtain a valid join token.');
        }

        // Step 2: Claim Occupancy Slot (Transactional)
        const claimFn = httpsCallable(functions, 'claimOccupancySlot');
        const claimRes = await claimFn({
          sessionId,
          connectionId: connectionIdRef.current,
          joinToken: rawJoinToken,
          forceTransfer,
        });

        const result = claimRes.data;
        if (result?.status === 'occupied') {
          setActiveConnectionId(result.currentConnectionId);
          setOccupancyState('occupied_conflict');
          return { status: 'occupied' };
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
    if (isAdmitted && occupancyState === 'idle' && !hasClaimedRef.current) {
      claimSlot(false);
    }
  }, [isAdmitted, occupancyState, claimSlot]);

  return {
    occupancyState,
    errorMessage,
    connectionId: connectionIdRef.current,
    claimSlot,
    cooldownSeconds,
  };
}
