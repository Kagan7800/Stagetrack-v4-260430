# Stagetrack System Status (STATUS.md)

## Task 1 — Token Utilities
Status:      COMPLETE
Commit:      HEAD
Tests:       8 passing (`functions/test/tokens.test.js`)
Amendments:  None
Verified by: Mocked pure crypto tests (`node --test test/tokens.test.js`)
Notes:       32-byte default entropy, URL-safe base64url regex enforcement, constant-time `crypto.timingSafeEqual`.

## Task 2 — Pass Creation (`createGuestPass`)
Status:      COMPLETE
Commit:      HEAD
Tests:       8 passing (`functions/test/guestPasses.test.js`)
Amendments:  None
Verified by: In-memory mock Firestore suite
Notes:       Stable `uid` minted (`guest_<16bytes>`), idempotent re-registration rotates `tokenHash` on existing pass doc.

## Task 3 — Redeem Endpoint (`GET /my/:token`)
Status:      COMPLETE
Commit:      HEAD
Tests:       5 passing (`functions/test/redeem.test.js`)
Amendments:  None
Verified by: In-memory mock Firestore + rate-limiter suite
Notes:       Byte-identical 404 failure responses, 429 with `Retry-After: 60`, `__session` device cookie.

## Task 4 — Session Router (`/session`)
Status:      COMPLETE
Commit:      HEAD
Tests:       5 passing (`functions/test/sessionRouter.test.js`)
Amendments:  None
Verified by: Pure state evaluation test suite
Notes:       6-state evaluator with millisecond boundary precision, 30-minute signed Cloud Storage URLs.

## Task 4.5 — Firestore Security Rules
Status:      COMPLETE
Commit:      HEAD
Tests:       11 passing (`functions/test/firestoreRules.test.js`)
Amendments:  None
Verified by: Live Firestore Emulator (`firebase emulators:exec`)
Notes:       Zero client access on sensitive collections, program isolation, anti-self-admission.

## Task 5 — Join Request & Admit Queue
Status:      COMPLETE
Commit:      HEAD
Tests:       5 passing (`functions/test/admitQueue.test.js`)
Amendments:  None
Verified by: In-memory mock Firestore suite
Notes:       Server-computed `isNewDevice`, batched transactional admission, strict ephemeral mood secrecy.

## Task 6 — Join Token & Exclusivity
Status:      COMPLETE
Commit:      HEAD
Tests:       11 passing (`functions/test/occupancy.test.js`) + 1 passing E2E (`functions/test/e2e.test.js`)
Amendments:  A5 applied (transactional `assertPassActive` in `mintJoinTokenHandler` and `claimOccupancySlotHandler`)
Verified by: In-memory mock Firestore suite with transactional concurrency
Notes:       15s cooldown, 45s staleness timeout, single-use 60s join tokens.

## Task 7 — Pass Recovery Flow
Status:      COMPLETE
Commit:      HEAD
Tests:       6 passing (`functions/test/recovery.test.js`)
Amendments:  None
Verified by: In-memory mock Firestore suite
Notes:       Multi-token pool (capped at 10, 90-day TTL), non-destructive recovery, strict refusal on revoked passes.

## Task 8 — Pass Management, Token Rotation, & Revocation
Status:      COMPLETE
Commit:      HEAD
Tests:       5 passing (`functions/test/passManagement.test.js`)
Amendments:  A5 applied, A5.1 applied (joinRequests deletion on revocation fails revocation if cleanup fails without swallowing error)
Verified by: In-memory mock Firestore suite
Notes:       Intentional rotation invalidates pool and mints fresh token; revocation clears pool, revokes auth refresh tokens, deletes occupancy slot, and deletes join requests.

## Task 9 — Delivery Pipeline & Telemetry Tracking
Status:      COMPLETE
Commit:      HEAD
Tests:       6 passing (`functions/test/delivery.test.js`)
Amendments:  None
Verified by: In-memory mock Firestore suite
Notes:       Durable `deliveryQueue` architecture with 15-minute TTL, anti-OTP validation.

---

## Amendment A5 & A5.1 — Pass Status Enforcement on Live-Session Path & Fail-on-Error Cleanup
Status:      COMPLETE
Commit:      a465249
Tests:       11 passing (`functions/test/occupancy.test.js`), 5 passing (`functions/test/passManagement.test.js`), 65 total passing across `functions/`
Amendments:  A5 applied, A5.1 applied, A5.2 verified (passId in joinRequests schema), A5.3 verified (status: 'active' at creation)
Verified by: In-memory mock Firestore suite with negative regression assertions failing before fix and passing after
Notes:       Added `assertPassActive` inside transactions for `mintJoinTokenHandler` and `claimOccupancySlotHandler`; added unwrapped `joinRequests` deletion to `revokeGuestPassHandler`.
