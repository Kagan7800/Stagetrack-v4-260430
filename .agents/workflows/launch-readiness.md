---
name: launch-readiness
description: Pre-production battle test. Covers failure injection, soak testing, real-device verification, migration rollback, rollout mechanics, cost ceilings, backup restore, and operational readiness. Run before any T3 release or first production launch.
---

# /launch-readiness

Code review asks whether the code is correct. This asks what happens when correct code meets production. Different failure sets — and the second one is where outages come from.

Run after `/code-review` passes. Everything here requires human approval to execute against a shared environment (AGENTS.md §2).

---

## 1. Gates Defined

- [ ] AGENTS.md §6 numbers are filled in, not `TBD`
- [ ] Error budget derived from them
- [ ] Rollback trigger stated **numerically and in advance** — not argued about during the incident
- [ ] Named person with the authority *and* the access to pull it at 3am

## 2. Failure Injection

Not "does it handle an error." These specific hostile cases:

- [ ] Dependency returning 500s
- [ ] Dependency **slow** rather than down — timeouts hurt more than failures, they consume connections
- [ ] Auth expiring mid-session
- [ ] Clock skew between client and server
- [ ] Network cut mid-write
- [ ] Firebase: quota exhaustion, security rules rejecting a write the client assumed would succeed, listener reconnect replaying already-delivered events
- [ ] Vendor partial outage in one region — vendor status pages recorded in the runbook

## 3. Soak & Load

- [ ] **24-hour soak**, not a five-minute load test
- [ ] Watch memory, connection pool size, and active listener count over time — Firebase listener leaks are quiet until they aren't
- [ ] Load test at expected peak and at 3× peak

## 4. Real Device, Real Network

- [ ] Mid-tier Android, throttled 3G, thermal throttling in play
- [ ] Confirms or refutes the Stage 6 containment and re-render work — benchmarks on a dev machine measure the dev machine

## 5. Migrations & Rollback

- [ ] Rollback script **executed at least once**, not merely written
- [ ] Dry run against a production-sized copy
- [ ] Backfills resumable and idempotent
- [ ] Old and new code tolerate the intermediate schema state — during rollout both will be running
- [ ] Note: "redeploy the previous version" stops being a rollback plan the moment data shape changes

## 6. Backups

- [ ] **Restore tested**, not just backup taken — an unrestored backup is an assumption
- [ ] Restore timed; RPO and RTO recorded as measured numbers

## 7. Rollout Mechanics

- [ ] Feature flag or staged percentage rollout
- [ ] Kill switch tested
- [ ] Canary metrics identified before the canary starts

## 8. Observability Verified

- [ ] Trigger a **real** error in staging; confirm it reaches the alert channel
- [ ] Synthetic checks on the critical path
- [ ] Dashboard exists before launch, not after the first incident

## 9. Cost & Quota Ceilings

- [ ] Budget alerts configured
- [ ] Per-user rate caps in place
- [ ] Retry loops bounded with backoff — a retry loop against a metered API is a textbook day-one incident, and it is exactly the debounce/idempotency path from review that produces it if it's wrong

## 10. Authorization Pass by Role

- [ ] Every role tested against every protected resource
- [ ] Specifically: user A requesting user B's object by ID

## 11. Data Reconciliation

- [ ] If state lives in more than one place (Firebase + downstream store, cache, analytics sink), a drift-detection job exists and alerts
- [ ] You learn about drift from the job, not from a user

## 12. Operational Readiness

- [ ] Runbook covering the top five predicted failure modes with fixes and escalation path
- [ ] Comms plan for users if it goes badly
- [ ] **Bus factor test:** someone other than the author deploys it, and debugs a seeded staging failure using only the runbook. If they can't, the runbook is wrong.

## 13. Telemetry Privacy

- [ ] Known PII inventory in live request and traffic logs
- [ ] Retention window set
- [ ] Deletion path exists — easier to answer before launch than after a subject access request

## 14. Post-Launch Loop

- [ ] SLOs watched actively for the first week
- [ ] After any incident, the corrective action is a new CI gate or a new rule in AGENTS.md — not a resolution to be more careful

---

**Priority note.** If time forces cuts, the tested rollback (§5) survives. Everything else lowers the probability of a bad launch; the rollback bounds the cost of one.
