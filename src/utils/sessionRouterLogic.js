/**
 * Pure evaluation logic for Session Router state transitions.
 * Pure module with zero I/O and injectable clock for deterministic testing.
 */

export const SESSION_STATES = {
  NO_SESSION: 'NO_SESSION',
  COUNTDOWN: 'COUNTDOWN',
  LOBBY: 'LOBBY',
  PROCESSING: 'PROCESSING',
  RECORDING: 'RECORDING',
  EXPIRED: 'EXPIRED',
};

/**
 * Normalizes various timestamp representations (Firestore Timestamp, Date, string, number) to epoch milliseconds.
 *
 * @param {unknown} timestamp Raw timestamp value
 * @returns {number|null} Epoch milliseconds or null
 */
export function toMillis(timestamp) {
  if (!timestamp) return null;
  if (typeof timestamp === 'number' && !Number.isNaN(timestamp)) return timestamp;
  if (typeof timestamp === 'object') {
    if (typeof timestamp.toMillis === 'function') return timestamp.toMillis();
    if (typeof timestamp.getTime === 'function') return timestamp.getTime();
    if (timestamp.seconds !== undefined) {
      return timestamp.seconds * 1000 + Math.floor((timestamp.nanoseconds || 0) / 1000000);
    }
  }
  if (typeof timestamp === 'string') {
    const parsed = Date.parse(timestamp);
    return Number.isNaN(parsed) ? null : parsed;
  }
  return null;
}

/**
 * Evaluates the current view state of a session given an injected timestamp.
 *
 * @param {object|null} session Session document data from Firestore
 * @param {number} [clockNow=Date.now()] Current epoch timestamp in milliseconds
 * @returns {{ state: string, [key: string]: any }} Determined view state and associated metadata
 */
export function evaluateSessionState(session, clockNow = Date.now()) {
  if (
    !session ||
    typeof session !== 'object' ||
    (!session.startsAt && !session.state && !session.endsAt && !session.lobbyOpensAt)
  ) {
    return {
      state: SESSION_STATES.NO_SESSION,
      message: 'No upcoming session is currently scheduled. Please check back soon or contact your instructor.',
    };
  }

  const now = typeof clockNow === 'number' && !Number.isNaN(clockNow) ? clockNow : Date.now();
  const startsAt = toMillis(session.startsAt);
  const endsAt = toMillis(session.endsAt);
  const lobbyOpensAt = toMillis(session.lobbyOpensAt) || (startsAt ? startsAt - 15 * 60 * 1000 : null);
  const recordingExpires = toMillis(session.recordingExpires) || (endsAt ? endsAt + 7 * 24 * 60 * 60 * 1000 : null);
  const recordingPath = session.recordingPath;
  const explicitState = session.state;

  // 1. Explicit LIVE / LOBBY_OPEN state overrides
  if (explicitState === 'live' || explicitState === 'lobby_open') {
    return {
      state: SESSION_STATES.LOBBY,
      startsAt,
      endsAt,
      lobbyOpensAt,
    };
  }

  // 2. Ended session states
  if (explicitState === 'ended' || (endsAt && now >= endsAt)) {
    // Past recording expiration window
    if (recordingExpires && now > recordingExpires) {
      return {
        state: SESSION_STATES.EXPIRED,
        recordingExpires,
        message: 'The recording for this session has expired.',
      };
    }

    // Within recording window, but recording path is not yet populated
    if (!recordingPath || typeof recordingPath !== 'string' || !recordingPath.trim()) {
      return {
        state: SESSION_STATES.PROCESSING,
        recordingExpires,
        message: "Today's recording will be ready shortly — please check back soon!",
      };
    }

    // Within window with ready recording
    return {
      state: SESSION_STATES.RECORDING,
      recordingPath: recordingPath.trim(),
      recordingExpires,
    };
  }

  // 3. Before lobby opens -> COUNTDOWN
  if (lobbyOpensAt && now < lobbyOpensAt) {
    return {
      state: SESSION_STATES.COUNTDOWN,
      startsAt,
      lobbyOpensAt,
      timeRemainingMs: Math.max(0, lobbyOpensAt - now),
    };
  }

  // 4. Default: Lobby open window (now >= lobbyOpensAt && now < endsAt)
  return {
    state: SESSION_STATES.LOBBY,
    startsAt,
    endsAt,
    lobbyOpensAt,
  };
}
