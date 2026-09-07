# Stagetrack Passwordless Guest Auth Specification (Current Ground Truth)

## Overview & Core Principles
Music Fun with My Little One passwordless guest pass, authentication, session routing, admit queue, and exclusivity subsystem.

### Non-Negotiable Invariants (§4 & Engineering Standing Rules)
1. **Raw Token Secrecy:** Raw access tokens and join tokens are NEVER stored in Firestore, Cloud Storage, or written to logs. Only SHA-256 hex hashes (`hashToken`) are persisted.
2. **Decoupled User Identity:** Firebase Auth `uid` is minted as a distinct random string (`guest_${generateToken(16)}`) on the pass document, completely decoupled from the raw access token and pass document ID.
3. **Constant-Time Verification:** Token comparison is strictly byte-exact and timing-safe (`crypto.timingSafeEqual`).
4. **Program Scoping:** Sessions, recordings, and join requests are strictly scoped to the guest's `programId` claim.
5. **Zero Client Pass Access:** `guestPasses`, `joinTokens`, and `rateLimits` have `allow read, write: if false` in `firestore.rules`.
6. **Ephemeral Mood Secrecy (§4.7):** Vibe/mood chips are held strictly in React memory for WebRTC and must NEVER be persisted in Firestore or logs.
7. **Short-Lived Signed URLs (§4.8):** Cloud Storage recording URLs expire in 30 minutes.
8. **Single Stream Exclusivity:** One active stream per pass with 15s transfer cooldown and real-time instant displacement.

---

## Progress Status by Task

### Task 1: Token Utilities — `COMPLETED`
- [x] Pure cryptographic helper in `functions/tokens.js`.
- [x] 32-byte default entropy, 16-byte minimum floor (`generateToken`).
- [x] URL-safe base64url regex enforcement (no `+`, `/`, `=`, whitespace).
- [x] Deterministic SHA-256 hex hashing (`hashToken`).
- [x] Boundary-safe non-throwing helper (`safeHashToken`).
- [x] Byte-exact constant-time comparison via `crypto.timingSafeEqual` (`verifyToken`).
- [x] Evidenced by 8 acceptance tests in `functions/test/tokens.test.js`.

### Task 2: Pass Creation (`createGuestPass`) — `COMPLETED`
- [x] Auth gate requiring `admin` or `instructor` custom claims.
- [x] Decoupled stable `uid` (`guest_<16bytes>`) persisted on the pass doc.
- [x] Idempotency & Re-registration: Re-creating pass for same `email` + `programId` rotates `tokenHash` on existing doc and preserves stable `uid`.
- [x] Strict E.164 phone validation (`/^\+[1-9]\d{6,14}$/` or `null`).
- [x] Fail-fast base URL configuration (`APP_BASE_URL`).
- [x] `getMyGuestPass` callable endpoint with IDOR protection returning sanitized metadata (`sanitizeGuestPassForClient`).
- [x] Evidenced by 8 acceptance tests in `functions/test/guestPasses.test.js`.

### Task 3: Redeem Endpoint (`GET /my/:token`) — `COMPLETED`
- [x] Distributed rate limiter (`functions/rateLimiter.js`) with 20/min per IP and 500/min global limits, 1-hour `expiresAt` TTL timestamps, and fail-open resilience.
- [x] Custom auth token minted using `pass.uid` with claims `{ passId, programId, isGuest: true }`.
- [x] Namespaced JSON `__session` device cookie (`{"dev":"<deviceId>"}`).
- [x] Response separation: HTTP 429 (`Retry-After: 60`) vs byte-identical generic HTTP 404s for not-found/revoked/malformed tokens.
- [x] Bootstrap HTML signs in with custom token and redirects via `location.replace('/session')` with zero tokens in URL.
- [x] Evidenced by 5 acceptance tests in `functions/test/redeem.test.js`.

### Task 4: Session Router (`/session`) — `COMPLETED`
- [x] Pure 6-state evaluator (`src/utils/sessionRouterLogic.js`):
  1. `NO_SESSION`: "No upcoming sessions scheduled."
  2. `COUNTDOWN`: Session scheduled in future.
  3. `LOBBY`: Within lobby window (`lobbyOpensAt` to `endsAt`).
  4. `PROCESSING`: Session ended, recording not yet ready.
  5. `RECORDING`: Recording ready, within expiration window.
  6. `EXPIRED`: Recording expired.
- [x] Short-lived signed URLs (30 min) minted via callable `getRecordingSignedUrl` (`functions/recordings.js`).
- [x] React UI screens: `SessionRouter.jsx`, `SessionCountdown.jsx`, `SessionProcessingNotice.jsx`, `SessionRecordingPlayer.jsx`, `SessionExpiredNotice.jsx`.
- [x] Evidenced by 5 acceptance tests in `functions/test/sessionRouter.test.js`.

### Task 4.5: Firestore Security Rules & Real Emulator Testing — `COMPLETED`
- [x] Real rules test suite using `@firebase/rules-unit-testing` executed against live Firestore emulator.
- [x] Zero client reads/writes on `guestPasses`, `joinTokens`, `rateLimits`, `agentLogs`.
- [x] Program-isolated session reads; instructor-only writes.
- [x] Anti-self-admission on `joinRequests` (parents can only create `pending` for active sessions; only instructors update/delete).
- [x] Lobby presence rules: parents write own heartbeat doc; instructors read/count.
- [x] Firebase Hosting rewrite: `/my/**` $\rightarrow$ `redeemPass` function in `firebase.json`.
- [x] Evidenced by 8 live Firestore emulator tests in `functions/test/firestoreRules.test.js`.

### Task 5: Join Request & Admit Queue — `COMPLETED`
- [x] Server-computed `isNewDevice` flag calculated in `functions/admitQueue.js` by comparing device hash against `knownDevices` array on the private pass doc.
- [x] Deterministic document ID `${sessionId}_${passId}` preventing duplicate requests.
- [x] Batched transactional `admitAllPending` in chunks up to 450 documents.
- [x] Denied state recovery: re-submission resets status to `pending`.
- [x] Strict §4.7 enforcement: mood/vibe chips never saved to Firestore.
- [x] UI components: `InstructorAdmitQueue.jsx` and `LobbyOverlay.jsx`.
- [x] Evidenced by 5 acceptance tests in `functions/test/admitQueue.test.js`.

### Task 6: Join Token & Exclusivity — `COMPLETED`
- [x] `mintJoinToken`: Mints 60-second single-use 32-byte crypto token for admitted requests, stored as SHA-256 hash in `joinTokens/{tokenHash}`.
- [x] `claimOccupancySlot`: Atomic transaction consuming join token (`used: true`) and claiming `occupancy/{passId}`.
- [x] Strict sequence: **Mint $\rightarrow$ Claim $\rightarrow$ WebRTC Media acquisition**.
- [x] Exclusivity conflict: Second connection receives `{ status: 'occupied' }` and triggers "Join here instead" prompt.
- [x] 15-second transfer cooldown (`lastTransferredAt`) preventing rapid ping-pong fights.
- [x] Real-time instant displacement: Pass owner subscribes to `occupancy/{passId}` via `onSnapshot` (0 ms delay).
- [x] 15-second heartbeat interval with 45-second server-side staleness timeout.
- [x] Mobile lifecycle: `pagehide` and `visibilitychange` release handlers.
- [x] UI components: `src/hooks/useSessionOccupancy.js` and `src/components/OccupancyTransferModal.jsx`.
- [x] Evidenced by 6 acceptance tests in `functions/test/occupancy.test.js` and full E2E flow in `functions/test/e2e.test.js`.

### Task 7: Pass Recovery Flow — `COMPLETED`
- [x] Unified auto-detecting input field handling email vs E.164 phone formats without tabs.
- [x] Multi-token hash pool (`activeTokenHashes` & `activeTokenPool` capped at 10 with 90-day TTL pruning) preserving bookmarked links on multiple family devices.
- [x] Strict refusal on revoked passes (`status: 'revoked'` passes cannot be recovered or resurrected).
- [x] Constant-time execution via non-blocking fire-and-forget delivery and identical response message for existing vs non-existing contacts.
- [x] Dual rate limiting: 10/min per IP and 3/hr per contact target.
- [x] UI component: `src/components/PassRecoveryModal.jsx` integrated into `LobbyOverlay.jsx`.
- [x] Evidenced by 6 acceptance tests in `functions/test/recovery.test.js`.

---

## Remaining Tasks

### Task 8: Pass Management, Token Rotation, & Revocation — `COMPLETED`
- [x] Admin/Instructor pass management API (`listGuestPasses`, `rotatePassLink`, `revokeGuestPass` in `functions/passManagement.js`) & UI (`src/components/InstructorPassManagement.jsx`).
- [x] Intentional rotation: Mints new token, replaces `activeTokenHashes = [newTokenHash]`, clears old pool, preserves stable `uid`.
- [x] Instant server revocation: Sets `status: 'revoked'`, clears `activeTokenHashes = []`, calls `admin.auth().revokeRefreshTokens(pass.uid)`, and deletes active occupancy slot.
- [x] Security rules enforcement: `isGuestPassActive()` enforces `status: 'active'` and validates `request.auth.token.auth_time > passDoc.data.revokedAt.toMillis() / 1000` with short-circuit protection for instructors.
- [x] Evidenced by 4 acceptance tests in `functions/test/passManagement.test.js` and 2 emulator security rules tests in `functions/test/firestoreRules.test.js`.

---

## Remaining Tasks

### Task 9: Deployment & Production Launch Readiness
- [ ] Configure Firestore TTL policy on `rateLimits` (`expiresAt`).
- [ ] Configure Firestore TTL policy on `joinTokens` (`expiresAt`).
- [ ] Run full test suite & `/launch-readiness` audit pass.
